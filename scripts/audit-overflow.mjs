/**
 * Mobile overflow audit: fails if any route scrolls horizontally, or if a
 * heading, button or footer link spills outside its box or the viewport, at
 * narrow widths. Not part of CI (the repo has no e2e project); run it against
 * a dev server before merging layout changes.
 *
 *   bunx vite --host 127.0.0.1   # in apps/dorkroom, note the port
 *   node scripts/audit-overflow.mjs http://127.0.0.1:<port>
 *
 * PW_CHANNEL=chrome uses the installed Chrome instead of Playwright's Chromium.
 */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4503';
const WIDTHS = [320, 360];
const ROUTES = ['/', '/border'];

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || undefined,
});
const failures = [];

for (const width of WIDTHS) {
  const page = await (
    await browser.newContext({ viewport: { width, height: 800 } })
  ).newPage();
  for (const route of ROUTES) {
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const problems = await page.evaluate((viewportWidth) => {
      const found = [];
      const root = document.documentElement;
      if (root.scrollWidth > viewportWidth) {
        found.push(`page scrollWidth ${root.scrollWidth} > ${viewportWidth}`);
      }
      for (const el of document.querySelectorAll('h1, button, footer a')) {
        const label = (el.textContent ?? '').trim().slice(0, 24);
        const box = el.getBoundingClientRect();
        if (el.scrollWidth > el.clientWidth + 1) {
          found.push(
            `<${el.tagName.toLowerCase()}> "${label}" content overflows its box`
          );
        }
        if (box.left < -0.5 || box.right > viewportWidth + 0.5) {
          found.push(
            `<${el.tagName.toLowerCase()}> "${label}" outside viewport`
          );
        }
      }
      return found;
    }, width);
    for (const problem of problems)
      failures.push(`${route} @${width}: ${problem}`);
  }
  await page.context().close();
}

await browser.close();
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`No overflow at ${WIDTHS.join('/')}px on ${ROUTES.join(', ')}`);
