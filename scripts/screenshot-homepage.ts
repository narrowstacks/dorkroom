/**
 * Capture the homepage screenshot used in README.md (written as WebP).
 * Usage: SCREENSHOT_URL=http://localhost:4300/ bun run scripts/screenshot-homepage.ts
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
const url = process.env.SCREENSHOT_URL ?? 'http://localhost:4300/';

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
  await view.screenshotWebp(outPath, WEBP_QUALITY);
  console.log(`Saved ${outPath}`);
} finally {
  view.close();
}
