/**
 * Upload local images to GitHub and get back permanent CDN URLs, without
 * committing them to the repo.
 *
 * GitHub has no API for image uploads. The only way in is the browser: dropping
 * a file on a comment box uploads it immediately and rewrites the box to
 * reference a permanent `user-attachments/assets/...` URL. That URL survives
 * even if the comment is never submitted — so we upload, harvest the URLs, and
 * clear the box without posting anything.
 *
 * Files go up strictly one at a time, each on its own page load. That is not
 * caution, it is the observed rule: a comment box accepts the *first* upload of
 * a page load and silently swallows every one after it, which is why batching
 * several files through one page used to lose most of them. One upload per page
 * also means exactly one asset URL can be in the box, so attribution is a fact
 * rather than a guess. Transient failures are retried with backoff; a file that
 * still fails is recorded and the run continues, so one bad upload never throws
 * away the ones that already worked.
 *
 * Auth uses a persistent browser profile outside the repo. Log in once, headed;
 * every run after that is headless.
 *
 *   bun run scripts/github-upload-attachment.ts --login
 *   bun run scripts/github-upload-attachment.ts --pr 42 a.webp b.webp
 *
 * Prints {"<path>": "<url>", ...} for the files that uploaded. Exits non-zero if
 * any file failed, with the failures listed on stderr.
 */
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import {
  type BrowserContext,
  chromium,
  type Locator,
  type Page,
} from 'playwright';

// Outside the repo on purpose: this profile holds a live GitHub session and
// must never be committed or copied into the working tree.
const PROFILE_DIR = join(homedir(), '.dorkroom', 'gh-upload-profile');

const ASSET_URL =
  /https:\/\/github\.com\/user-attachments\/assets\/[0-9a-fA-F-]+/g;

// GitHub's own copy when an upload is refused. Deliberately narrower than a
// bare /failed/i, which also matches an innocent filename: a shot named
// `light-meter-failed-state.webp` reads back as `![Uploading
// light-meter-failed-state.webp…]()` and used to be reported as a rejection.
const UPLOAD_REJECTED =
  /(failed to upload|upload failed|unable to upload)[^\n]*/i;

/**
 * How to find the PR's main "Add a comment" box, most specific first.
 *
 * These are tried **in order**, one locator at a time. Comma-joining them into
 * a single selector does not work: Playwright's `.first()` resolves in DOM
 * order, not selector order, so on any PR that has inline review threads the
 * loose `textarea[id*="comment"]` arm wins and hands back a collapsed inline
 * *reply* box that sits higher up the page. That box's uploader never runs, so
 * files dropped on it vanish with no placeholder and no error — which is most
 * of the reported flakiness, since every reviewed PR has those threads.
 */
const COMMENT_BOX_SELECTORS = [
  'form#new_comment_form textarea#new_comment_field',
  'form.js-new-comment-form textarea',
  '#new_comment_field',
  'textarea[name="comment[body]"]',
];

const UPLOAD_TIMEOUT_MS = 60_000;
const LOGIN_TIMEOUT_MS = 300_000;
const CLEAR_TIMEOUT_MS = 5_000;
const POLL_MS = 500;

/** Attempts per file, including the first. */
export const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 1_000;
const RETRY_CAP_MS = 8_000;

// ---------------------------------------------------------------------------
// Pure logic. Kept free of Playwright so the parts that decide *what happened*
// are unit-testable; the browser glue below stays as thin as it can be.
// ---------------------------------------------------------------------------

/** Whether a failure is worth another attempt. */
export type FailureKind = 'permanent' | 'transient';

export class UploadFailure extends Error {
  readonly kind: FailureKind;

  constructor(message: string, kind: FailureKind) {
    super(message);
    this.name = 'UploadFailure';
    this.kind = kind;
  }
}

/**
 * What the comment box is telling us right now.
 *
 * `ready` is only reachable with exactly one asset URL present. Anything more
 * means a straggler from an earlier file landed in the same box, and picking one
 * would silently attach the wrong screenshot — so that is a failure, not a
 * heuristic.
 */
export type BoxState =
  | { status: 'empty' }
  | { status: 'pending' }
  | { status: 'ready'; url: string }
  | { status: 'rejected'; detail: string }
  | { status: 'ambiguous'; urls: string[] };

export function readBoxState(value: string): BoxState {
  const urls = [...value.matchAll(ASSET_URL)].map((m) => m[0]);
  if (urls.length === 1) {
    return { status: 'ready', url: urls[0] };
  }
  if (urls.length > 1) {
    return { status: 'ambiguous', urls };
  }
  const rejection = value.match(UPLOAD_REJECTED);
  if (rejection) {
    return { status: 'rejected', detail: rejection[0].trim() };
  }
  return value.trim() === '' ? { status: 'empty' } : { status: 'pending' };
}

/**
 * GitHub names the file it just accepted, in the markup it writes back:
 * `<img ... alt="alpha-red" src="…" />` for images, `[report.pdf](…)` for
 * everything else. That turns attribution from "only one URL is in the box" into
 * something we can positively assert, so a URL can never be pinned to the wrong
 * screenshot in silence.
 *
 * Returns a description of the disagreement, or null when the markup names this
 * file or names nothing at all. Deliberately forgiving: names are compared with
 * separators and case stripped, and either being a prefix of the other counts as
 * a match, because GitHub truncates long names.
 */
export function attributionMismatch(
  markup: string,
  file: string
): string | null {
  const claimed =
    markup.match(/alt="([^"]*)"/)?.[1] ??
    markup.match(
      /!?\[([^\]]+)\]\(https:\/\/github\.com\/user-attachments/
    )?.[1];
  if (!claimed) {
    return null;
  }
  const normalize = (name: string) =>
    name
      .replace(/\.[a-z0-9]+$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const want = normalize(file.split('/').pop() ?? file);
  const got = normalize(claimed);
  if (!want || !got || want.startsWith(got) || got.startsWith(want)) {
    return null;
  }
  return `GitHub returned an asset named "${claimed}" while uploading ${file}; that URL belongs to a different file.`;
}

// Retrying a refusal just refuses again. These are GitHub saying no, or the
// operator passing something that does not exist.
const PERMANENT = [
  /failed to upload/i,
  /upload failed/i,
  /unable to upload/i,
  /rejected/i,
  /too large/i,
  /exceeds/i,
  /not supported/i,
  /unsupported/i,
  /no such file/i,
];

/** Fallback classifier for errors that arrive without a `kind` (Playwright's). */
export function classifyFailure(message: string): FailureKind {
  return PERMANENT.some((re) => re.test(message)) ? 'permanent' : 'transient';
}

export function retryDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_CAP_MS);
}

interface RetryOptions {
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * Run `run` until it succeeds, a permanent failure comes back, or the attempts
 * run out. `sleep` is injectable so tests do not wait out the backoff.
 */
export async function attemptWithRetry<T>(
  run: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  for (let attempt = 1; ; attempt++) {
    try {
      return await run(attempt);
    } catch (caught) {
      const error =
        caught instanceof Error ? caught : new Error(String(caught));
      const kind =
        caught instanceof UploadFailure
          ? caught.kind
          : classifyFailure(error.message);
      if (kind === 'permanent' || attempt >= maxAttempts) {
        throw error;
      }
      const delay = retryDelayMs(attempt);
      options.onRetry?.(attempt, error, delay);
      await sleep(delay);
    }
  }
}

export interface FileOutcome {
  file: string;
  /** The harvested URL, or null when every attempt failed. */
  url: string | null;
  attempts: number;
  error?: string;
}

export interface UploadSummary {
  urls: Record<string, string>;
  failures: Array<{ file: string; error: string }>;
  ok: boolean;
}

export function summarizeOutcomes(outcomes: FileOutcome[]): UploadSummary {
  const urls: Record<string, string> = {};
  const failures: Array<{ file: string; error: string }> = [];
  for (const outcome of outcomes) {
    if (outcome.url) {
      urls[outcome.file] = outcome.url;
    } else {
      failures.push({ file: outcome.file, error: outcome.error ?? 'unknown' });
    }
  }
  return { urls, failures, ok: failures.length === 0 };
}

export function formatFailureReport(
  failures: Array<{ file: string; error: string }>,
  prNumber: string
): string {
  const lines = [
    `${failures.length} file(s) failed to upload:`,
    ...failures.map((f) => `  ${f.file}: ${f.error}`),
    '',
    'The JSON above holds every file that did upload. Re-run just the failures:',
    `  bun run scripts/github-upload-attachment.ts --pr ${prNumber} ${failures
      .map((f) => f.file)
      .join(' ')}`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Browser glue.
// ---------------------------------------------------------------------------

async function sh(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  if ((await proc.exited) !== 0) {
    throw new Error(`\`${cmd.join(' ')}\` failed: ${err.trim()}`);
  }
  return out.trim();
}

async function open(headless: boolean): Promise<BrowserContext> {
  return chromium.launchPersistentContext(PROFILE_DIR, { headless });
}

/** GitHub stamps the logged-in user into a meta tag on every page. */
async function loggedInUser(page: Page): Promise<string | null> {
  const user = await page
    .locator('meta[name="user-login"]')
    .first()
    .getAttribute('content')
    .catch(() => null);
  return user || null;
}

async function login() {
  const context = await open(false);
  try {
    const page = await context.newPage();
    await page.goto('https://github.com/login');
    console.log(
      'A browser window is open. Log into GitHub there.\n' +
        'Waiting for the session (up to 5 minutes)...'
    );
    const deadline = Date.now() + LOGIN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const user = await loggedInUser(page);
      if (user) {
        console.log(
          `Logged in as ${user}. Session saved — future runs are headless.`
        );
        return;
      }
      await page.waitForTimeout(2_000);
    }
    throw new Error('Timed out waiting for login.');
  } finally {
    // Give GitHub's cookie writes a moment to flush to the profile on disk
    // before we tear the context down, or the session won't actually persist.
    await new Promise((r) => setTimeout(r, 1_000));
    await context.close();
  }
}

interface Session {
  page: Page;
  /** The main comment textarea. */
  box: Locator;
  /** The file input belonging to the *same* widget as `box`. */
  fileInput: Locator;
}

/** First selector that actually matches, tried in priority order. */
async function firstMatch(
  page: Page,
  selectors: string[]
): Promise<Locator | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) {
      return locator;
    }
  }
  return null;
}

/**
 * Wipe the comment box.
 *
 * The `input` event matters: without it GitHub's draft autosave keeps the staged
 * markup and resurrects it on the next load.
 */
async function clearBox(box: Locator): Promise<void> {
  await box.evaluate((el: HTMLTextAreaElement) => {
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/**
 * Clear the box and confirm it stayed clear.
 *
 * A restored draft can repopulate it a tick after the wipe, so this asserts the
 * emptiness rather than clearing once and hoping. Getting this right is what
 * makes single-URL attribution sound.
 */
async function ensureEmptyBox(page: Page, box: Locator): Promise<void> {
  const deadline = Date.now() + CLEAR_TIMEOUT_MS;
  for (;;) {
    await clearBox(box);
    if (readBoxState(await box.inputValue()).status === 'empty') {
      return;
    }
    if (Date.now() >= deadline) {
      throw new UploadFailure(
        'Comment box would not stay empty; refusing to upload into a dirty box.',
        'transient'
      );
    }
    await page.waitForTimeout(POLL_MS);
  }
}

async function openPrPage(
  context: BrowserContext,
  url: string
): Promise<Session> {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const user = await loggedInUser(page);
  if (!user) {
    throw new Error(
      'Not logged into GitHub in the upload profile.\n' +
        'Run: bun run scripts/github-upload-attachment.ts --login'
    );
  }

  const box = await firstMatch(page, COMMENT_BOX_SELECTORS);
  if (!box) {
    throw new Error(
      `No comment box on ${url}. Is the PR locked, or the number wrong?`
    );
  }

  // Take the file input from the same <file-attachment> wrapper as the box we
  // just chose. A page-wide `input[type="file"]`.first() is a different widget
  // whenever the PR has inline review threads, and dropping a file there
  // uploads it into a box we are not reading.
  const fileInput = box
    .locator('xpath=ancestor::file-attachment[1]')
    .locator('input[type="file"]')
    .first();
  if ((await fileInput.count()) === 0) {
    throw new Error(
      `Found the comment box on ${url} but no file input beside it; GitHub's markup moved.`
    );
  }
  return { page, box, fileInput };
}

/** Drop the page, taking any upload still in flight against it with it. */
async function discardSession(session: Session): Promise<void> {
  await clearBox(session.box).catch(() => {});
  await session.page.close().catch(() => {});
}

/** Hand one file to GitHub and wait for it to come back as a URL. */
async function uploadOne(session: Session, file: string): Promise<string> {
  const { page, box, fileInput } = session;
  await ensureEmptyBox(page, box);

  // The real <input type="file"> is display:none, so it can't be clicked — but
  // setInputFiles doesn't need visibility, only attachment. That skips the
  // whole dropzone-click / file-chooser dance.
  await fileInput.setInputFiles(file);

  // GitHub parks an `![Uploading file.webp…]()` placeholder in the box and
  // swaps it for the real reference when the upload lands (currently an
  // `<img ... src="https://github.com/user-attachments/assets/…" />` tag, not
  // markdown) — 1-10s, no event to hook, so poll for the URL rather than
  // sleeping a fixed interval.
  const deadline = Date.now() + UPLOAD_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const markup = await box.inputValue();
    const state = readBoxState(markup);
    if (state.status === 'ready') {
      const mismatch = attributionMismatch(markup, file);
      if (mismatch) {
        throw new UploadFailure(mismatch, 'transient');
      }
      await clearBox(box);
      return state.url;
    }
    if (state.status === 'rejected') {
      // GitHub replaces the placeholder with its own note rather than surfacing
      // an error, so a refused file would otherwise hang until the timeout.
      throw new UploadFailure(
        `GitHub rejected ${file}: ${state.detail}`,
        'permanent'
      );
    }
    if (state.status === 'ambiguous') {
      throw new UploadFailure(
        `${state.urls.length} asset URLs in the comment box while uploading ${file}; ` +
          'cannot tell which one is this file.',
        'transient'
      );
    }
    await page.waitForTimeout(POLL_MS);
  }
  throw new UploadFailure(
    `Timed out waiting for GitHub to accept ${file}.`,
    'transient'
  );
}

async function upload(prNumber: string, files: string[]): Promise<number> {
  const repo = await sh([
    'gh',
    'repo',
    'view',
    '--json',
    'nameWithOwner',
    '-q',
    '.nameWithOwner',
  ]);
  const prUrl = `https://github.com/${repo}/pull/${prNumber}`;

  const context = await open(true);
  // Fail fast and loudly on the things no retry can fix: an expired session or
  // a PR that has no comment box.
  let session: Session | null = await openPrPage(context, prUrl);
  const outcomes: FileOutcome[] = [];

  try {
    for (const file of files) {
      let attempts = 0;
      // A missing path is one file's problem, not the run's. Record it and keep
      // going so a typo in one glob cannot discard everything else.
      if (!(await Bun.file(file).exists())) {
        const message = `No such file: ${file}`;
        outcomes.push({ file, url: null, attempts, error: message });
        console.error(`FAILED ${message}`);
        continue;
      }
      try {
        const url = await attemptWithRetry(
          async (attempt) => {
            attempts = attempt;
            // Every attempt gets its own page load. Measured against a real PR:
            // the comment box accepts the *first* upload of a page load and
            // silently swallows every one after it — no placeholder, no error,
            // nothing lands in any textarea on the page. Reusing the page is
            // what made batch uploads flaky. A fresh page also takes any
            // still-in-flight upload with it when it closes, so a straggler
            // can never land in the next file's box.
            session ??= await openPrPage(context, prUrl);
            const current = session;
            session = null;
            try {
              return await uploadOne(current, file);
            } finally {
              await discardSession(current);
            }
          },
          {
            onRetry: (attempt, error, delayMs) =>
              console.error(
                `retry ${attempt}/${MAX_ATTEMPTS - 1} for ${file} in ${delayMs}ms: ${error.message}`
              ),
          }
        );
        outcomes.push({ file, url, attempts });
        console.error(`uploaded ${file}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        outcomes.push({ file, url: null, attempts, error: message });
        console.error(`FAILED ${file}: ${message}`);
      }
    }
  } finally {
    // Leave no draft behind, whatever happened.
    if (session) {
      await clearBox(session.box).catch(() => {});
    }
    await context.close();
  }

  const summary = summarizeOutcomes(outcomes);
  console.log(JSON.stringify(summary.urls, null, 2));
  if (!summary.ok) {
    console.error(`\n${formatFailureReport(summary.failures, prNumber)}`);
    return 1;
  }
  return 0;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);

  if (argv.includes('--login')) {
    await login();
    return 0;
  }

  const prIndex = argv.indexOf('--pr');
  const prNumber = prIndex === -1 ? undefined : argv[prIndex + 1];
  const files = argv
    .filter((a, i) => i !== prIndex && i !== prIndex + 1 && !a.startsWith('--'))
    .map((f) => (isAbsolute(f) ? f : resolve(f)));

  if (!prNumber || files.length === 0) {
    throw new Error(
      'Usage:\n' +
        '  bun run scripts/github-upload-attachment.ts --login\n' +
        '  bun run scripts/github-upload-attachment.ts --pr <number> <file>...'
    );
  }
  return upload(prNumber, files);
}

// Bun sets import.meta.main for the entry module; under Vitest (node) it is
// undefined, so importing this file in tests does not run main().
if (import.meta.main) {
  // Every failure here is something the operator has to act on (log in, fix a
  // path, pass a PR number). A Bun stack trace buries that, so print the message
  // and nothing else.
  try {
    process.exit(await main());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
