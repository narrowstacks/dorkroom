/**
 * Capture the screenshots a PR needs to show what it changed.
 *
 * Pure mechanism: given a shot list and a running server, it writes WebP files.
 * It knows nothing about git, diffs, or pull requests — the `pr-screenshots`
 * skill decides *what* to shoot and calls this to actually shoot it.
 *
 * Usage:
 *   bun run scripts/pr-screenshots.ts <shot-list.json>
 *   bun run scripts/pr-screenshots.ts <shot-list.json> --base-url http://localhost:4201 --out-dir .pr-screenshots/before
 *
 * CLI flags override the equivalent keys in the shot list, which lets the same
 * list be replayed against the merge-base server for the "before" capture.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaptureView, VIEWPORTS, type Viewport } from './webview-capture';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Matches scripts/screenshot-homepage.ts: WebP q90 keeps UI text and gradients
// crisp at roughly a tenth of the equivalent PNG. GitHub renders WebP inline.
const WEBP_QUALITY = 90;

// The dev server floats overlays over the app that a reviewer must never see in
// a screenshot: the TanStack Query devtools button (.tsqd-*), the Router
// devtools, and the Vercel toolbar. They're dev-only, so hiding them makes the
// shot look like production rather than like someone's laptop.
const HIDE_DEV_OVERLAYS = `
  [class*="tsqd-"],
  [class*="tsrd-"],
  #vercel-live-feedback,
  vercel-live-feedback,
  [data-vercel-toolbar] { display: none !important; }
`;

// The four real themes, matching packages/ui/src/contexts/theme-context.tsx.
// 'system' is deliberately excluded: a screenshot must be deterministic, and
// 'system' defers to the headless browser's prefers-color-scheme.
const THEMES = ['light', 'dark', 'darkroom', 'high-contrast'] as const;

const THEME_STORAGE_KEY = 'dorkroom-theme';

type Theme = (typeof THEMES)[number];

type Action =
  | { fill: string; value: string }
  | { click: string }
  | { select: string; value: string }
  | { waitFor: string }
  | { scrollTo: string };

interface Shot {
  id: string;
  route: string;
  viewport?: Viewport;
  theme?: Theme;
  actions?: Action[];
}

interface ShotList {
  baseUrl?: string;
  outDir?: string;
  shots: Shot[];
}

interface ShotResult {
  id: string;
  route: string;
  viewport: Viewport;
  theme: Theme;
  /** Repo-relative path to the captured image, or null when the shot failed. */
  file: string | null;
  /** Why the shot failed. A failed shot is not necessarily fatal — see below. */
  error?: string;
}

function parseArgs(argv: string[]) {
  const [listPath, ...rest] = argv;
  if (!listPath) {
    throw new Error(
      'Usage: bun run scripts/pr-screenshots.ts <shot-list.json> [--base-url URL] [--out-dir DIR]'
    );
  }
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    const value = rest[i + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Malformed flag near "${key}"`);
    }
    flags[key.slice(2)] = value;
  }
  return {
    listPath,
    baseUrl: flags['base-url'],
    outDir: flags['out-dir'],
  };
}

/**
 * Validate the shot list up front. A typo in a theme name should fail before we
 * spend a minute booting a browser and capturing 11 other shots.
 */
function validate(list: ShotList): asserts list is ShotList {
  if (!Array.isArray(list.shots) || list.shots.length === 0) {
    throw new Error('Shot list has no shots.');
  }
  const seen = new Set<string>();
  for (const shot of list.shots) {
    if (!shot.id) throw new Error('Every shot needs an id.');
    if (seen.has(shot.id)) {
      throw new Error(`Duplicate shot id "${shot.id}" — ids become filenames.`);
    }
    seen.add(shot.id);
    if (!shot.route?.startsWith('/')) {
      throw new Error(`Shot "${shot.id}": route must start with "/".`);
    }
    if (shot.viewport && !(shot.viewport in VIEWPORTS)) {
      throw new Error(
        `Shot "${shot.id}": unknown viewport "${shot.viewport}". Use ${Object.keys(VIEWPORTS).join(' or ')}.`
      );
    }
    if (shot.theme && !THEMES.includes(shot.theme)) {
      throw new Error(
        `Shot "${shot.id}": unknown theme "${shot.theme}". Use one of ${THEMES.join(', ')}.`
      );
    }
  }
}

async function runAction(view: CaptureView, action: Action, shotId: string) {
  if ('fill' in action) {
    await view.fill(action.fill, action.value);
  } else if ('click' in action) {
    await view.click(action.click);
  } else if ('select' in action) {
    await view.selectOption(action.select, action.value);
  } else if ('waitFor' in action) {
    await view.waitForVisible(action.waitFor, 15_000);
  } else if ('scrollTo' in action) {
    await view.scrollTo(action.scrollTo);
  } else {
    throw new Error(
      `Shot "${shotId}": unknown action ${JSON.stringify(action)}. ` +
        'Supported: fill, click, select, waitFor, scrollTo.'
    );
  }
}

async function capture(
  shot: Shot,
  baseUrl: string,
  outDir: string
): Promise<ShotResult> {
  const viewport = shot.viewport ?? 'desktop';
  const theme = shot.theme ?? 'dark';
  const result: Omit<ShotResult, 'file' | 'error'> = {
    id: shot.id,
    route: shot.route,
    viewport,
    theme,
  };

  // One view per shot: each gets its own renderer and its own ephemeral
  // storage, so a theme or form state from the previous shot can't leak in.
  const view = await CaptureView.open({
    ...VIEWPORTS[viewport],
    deviceScaleFactor: 2,
    // Belt and braces: the app resolves the 'system' theme from this, and any
    // component reading prefers-color-scheme directly should agree with the
    // theme we're forcing below.
    colorScheme: theme === 'light' ? 'light' : 'dark',
    reducedMotion: true,
    // The app persists the theme under this key and applies it as
    // <html data-theme="...">. Seeding it before any script runs avoids a
    // first-paint flash of the wrong theme landing in the screenshot.
    initScript: `try { localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, ${JSON.stringify(theme)}) } catch {}`,
  });

  try {
    await view.goto(`${baseUrl}${shot.route}`);

    for (const action of shot.actions ?? []) {
      await runAction(view, action, shot.id);
    }

    await view.addStyleTag(HIDE_DEV_OVERLAYS);
    await view.waitForFonts();

    const file = join(outDir, `${shot.id}.webp`);
    await view.screenshotWebp(join(ROOT, file), WEBP_QUALITY);

    console.log(`  ✓ ${shot.id}  (${shot.route}, ${viewport}, ${theme})`);
    return { ...result, file };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ✗ ${shot.id}  ${message.split('\n')[0]}`);
    return { ...result, file: null, error: message };
  } finally {
    view.close();
  }
}

const args = parseArgs(process.argv.slice(2));
const list: ShotList = await Bun.file(args.listPath).json();
validate(list);

const baseUrl = (
  args.baseUrl ??
  list.baseUrl ??
  'http://localhost:4200'
).replace(/\/$/, '');
const outDir = args.outDir ?? list.outDir ?? '.pr-screenshots';
if (isAbsolute(outDir)) {
  // Upload backends can only read files inside the workspace root, so the
  // output has to stay repo-relative. See the skill's Step 5.
  throw new Error(`--out-dir must be repo-relative, got "${outDir}".`);
}

await mkdir(join(ROOT, outDir), { recursive: true });

console.log(`Capturing ${list.shots.length} shot(s) from ${baseUrl}`);
const results: ShotResult[] = [];
for (const shot of list.shots) {
  results.push(await capture(shot, baseUrl, outDir));
}

const manifestPath = join(outDir, 'manifest.json');
await writeFile(
  join(ROOT, manifestPath),
  `${JSON.stringify({ baseUrl, shots: results }, null, 2)}\n`
);

const failed = results.filter((r) => !r.file);
console.log(
  `\n${results.length - failed.length}/${results.length} captured → ${manifestPath}`
);

// A failed shot is fatal *here* but not necessarily to the caller: when
// replaying this list against the merge-base, a route that doesn't exist yet is
// expected to fail. The skill reads the manifest and decides. Exiting non-zero
// keeps an unnoticed typo in a shot list from silently producing a PR with no
// screenshots.
if (failed.length > 0) {
  console.error(
    `\n${failed.length} shot(s) failed. If this was the "before" capture, a ` +
      'missing route or selector may just mean the UI is new — check the manifest.'
  );
  process.exit(1);
}
