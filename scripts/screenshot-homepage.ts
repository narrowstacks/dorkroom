/**
 * Capture the homepage screenshot used in README.md.
 * Usage: SCREENSHOT_URL=http://localhost:4300/ bun run scripts/screenshot-homepage.ts
 * Requires a running server (vite preview or dev) at SCREENSHOT_URL.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WIDTH = 1280;
const HEIGHT = 918;
const url = process.env.SCREENSHOT_URL ?? 'http://localhost:4300/';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'resources', 'dorkroom-homepage.png');

await mkdir(dirname(outPath), { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });
  // Force the app's dark theme regardless of the headless browser's
  // prefers-color-scheme. The app persists the choice under this localStorage
  // key and applies it via the <html data-theme="..."> attribute.
  await page.addInitScript(() => {
    localStorage.setItem('dorkroom-theme', 'dark');
  });
  console.log(`Navigating to ${url} ...`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  // Wait for the hero card (stable homepage element) and web fonts.
  await page
    .locator('.hero-card')
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outPath }); // viewport-only, not full page
  console.log(`Saved ${outPath}`);
} finally {
  await browser.close();
}
