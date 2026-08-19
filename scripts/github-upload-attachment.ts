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
 * Auth uses a persistent browser profile outside the repo. Log in once, headed;
 * every run after that is headless.
 *
 *   bun run scripts/github-upload-attachment.ts --login
 *   bun run scripts/github-upload-attachment.ts --pr 42 a.webp b.webp
 *
 * Prints {"<path>": "<url>", ...} to stdout on success.
 */
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { type BrowserContext, chromium, type Page } from 'playwright';

// Outside the repo on purpose: this profile holds a live GitHub session and
// must never be committed or copied into the working tree.
const PROFILE_DIR = join(homedir(), '.dorkroom', 'gh-upload-profile');

const ASSET_URL =
  /https:\/\/github\.com\/user-attachments\/assets\/[0-9a-fA-F-]+/g;

// GitHub moves this markup around every so often; try the stable id first, then
// progressively looser selectors.
const COMMENT_BOX = [
  '#new_comment_field',
  'textarea[name="comment[body]"]',
  'textarea[id*="comment"]',
].join(', ');

const UPLOAD_TIMEOUT_MS = 60_000;
const LOGIN_TIMEOUT_MS = 300_000;

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

/**
 * Hand one file to GitHub and wait for it to come back as a URL.
 *
 * `seen` carries the URLs already in the comment box, so a batch upload can
 * tell which URL belongs to which file: whatever is new is this file's.
 */
async function uploadOne(
  page: Page,
  file: string,
  seen: Set<string>
): Promise<string> {
  // The real <input type="file"> is display:none, so it can't be clicked — but
  // setInputFiles doesn't need visibility, only attachment. That skips the
  // whole dropzone-click / file-chooser dance.
  await page.locator('input[type="file"]').first().setInputFiles(file);

  // GitHub parks an `![Uploading file.webp…]()` placeholder in the box and
  // swaps it for the real reference when the upload lands — 1-5s, no event to
  // hook, so poll for the URL rather than sleeping a fixed interval.
  const deadline = Date.now() + UPLOAD_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const value = await page.locator(COMMENT_BOX).first().inputValue();
    const fresh = [...value.matchAll(ASSET_URL)]
      .map((m) => m[0])
      .filter((url) => !seen.has(url));
    if (fresh.length > 0) {
      const url = fresh[0];
      seen.add(url);
      return url;
    }
    // GitHub replaces the placeholder with a "Failed to upload" note rather
    // than surfacing an error, so a rejected file would otherwise just hang
    // until the timeout.
    if (/failed/i.test(value)) {
      throw new Error(`GitHub rejected ${file}: ${value.trim()}`);
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Timed out waiting for GitHub to accept ${file}.`);
}

async function upload(prNumber: string, files: string[]) {
  const repo = await sh([
    'gh',
    'repo',
    'view',
    '--json',
    'nameWithOwner',
    '-q',
    '.nameWithOwner',
  ]);
  const url = `https://github.com/${repo}/pull/${prNumber}`;

  const context = await open(true);
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const user = await loggedInUser(page);
    if (!user) {
      throw new Error(
        'Not logged into GitHub in the upload profile.\n' +
          'Run: bun run scripts/github-upload-attachment.ts --login'
      );
    }

    const box = page.locator(COMMENT_BOX).first();
    if ((await box.count()) === 0) {
      throw new Error(
        `No comment box on ${url}. Is the PR locked, or the number wrong?`
      );
    }

    const seen = new Set<string>();
    const urls: Record<string, string> = {};
    for (const file of files) {
      urls[file] = await uploadOne(page, file, seen);
      console.error(`uploaded ${file}`);
    }

    // Leave no draft behind. The `input` event matters: without it GitHub's
    // draft autosave keeps the staged markup and resurrects it on next load.
    await box.evaluate((el: HTMLTextAreaElement) => {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    console.log(JSON.stringify(urls, null, 2));
  } finally {
    await context.close();
  }
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--login')) {
    await login();
    return;
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
  for (const file of files) {
    if (!(await Bun.file(file).exists())) {
      throw new Error(`No such file: ${file}`);
    }
  }
  await upload(prNumber, files);
}

// Every failure here is something the operator has to act on (log in, fix a
// path, pass a PR number). A Bun stack trace buries that, so print the message
// and nothing else.
try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
