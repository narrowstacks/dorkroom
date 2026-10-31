/**
 * Capture the homepage screenshot used in README.md (written as WebP).
 * Usage: SCREENSHOT_URL=http://localhost:<port>/ bun run scripts/screenshot-homepage.ts
 * Requires a running server (vite preview or dev) at SCREENSHOT_URL.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaptureView } from './webview-capture';

const WIDTH = 1280;
const HEIGHT = 918;
// WebP quality 90 keeps UI text and gradients crisp while cutting the file to
// roughly a tenth of the equivalent PNG.
const WEBP_QUALITY = 90;
// With animations frozen, repeat captures on one machine are byte-identical.
// The tolerance covers drift between CI runner images (Chrome or font
// updates); before the freeze, unchanged pages never moved a channel past
// 19/255. A real change (even one edited word) moves hundreds of pixels well
// past that, so only commit when enough pixels clear the tolerance.
const NOISE_TOLERANCE = 40;
const MIN_CHANGED_PIXELS = 100;
const url = process.env.SCREENSHOT_URL;
if (!url) {
  throw new Error(
    'SCREENSHOT_URL is not set. Point it at the running server, e.g. the "Local:" URL Vite prints.'
  );
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'resources', 'dorkroom-homepage.webp');

await mkdir(dirname(outPath), { recursive: true });

const view = await CaptureView.open({
  width: WIDTH,
  height: HEIGHT,
  colorScheme: 'dark',
  // Force the app's dark theme regardless of the headless browser's
  // prefers-color-scheme. The app persists the choice under this localStorage
  // key and applies it via the <html data-theme="..."> attribute.
  initScript: `try { localStorage.setItem('dorkroom-theme', 'dark') } catch {}`,
});
try {
  console.log(`Navigating to ${url} ...`);
  await view.goto(url);
  // Wait for the hero panel (stable homepage element) and web fonts.
  await view.waitForVisible('.hero-grain', 30_000);
  await view.waitForFonts();
  // The hero grain and the headline's grain and glow scroll their noise, so
  // each capture caught a different offset. Their feTurbulence tiles use a
  // fixed (default) seed, so frozen at frame 0 they match on every run.
  await view.freezeAnimations();
  const next = await view.screenshotWebpBytes(WEBP_QUALITY);

  const current = Bun.file(outPath);
  const changed = (await current.exists())
    ? await view.countChangedPixels(
        await current.bytes(),
        next,
        'image/webp',
        NOISE_TOLERANCE
      )
    : -1;

  // -1 means no previous image, or one of a different size: always write.
  if (changed !== -1 && changed < MIN_CHANGED_PIXELS) {
    console.log(
      `Only ${changed} pixel(s) differ beyond capture noise; keeping ${outPath}.`
    );
  } else {
    await Bun.write(outPath, next);
    console.log(`Saved ${outPath} (${changed} pixel(s) changed).`);
  }
} finally {
  view.close();
}
