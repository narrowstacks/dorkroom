/**
 * Verify the @vitejs/plugin-legacy dual-bundle output in a real browser.
 *
 * Two things must hold for the Kindle-browser support (PR #92) to be both
 * effective and safe:
 *
 *   1. MODERN PATH (regression guard): a modern, ES-module-capable browser must
 *      load ONLY the modern `index-*.js` bundle and must NOT request any
 *      `*-legacy-*.js` / `polyfills-legacy-*.js` chunk. This proves we don't
 *      "gimp" modern browsers — they get the exact same oxc-minified bundle as
 *      before the plugin was added.
 *
 *   2. LEGACY PATH (feature works): the ES5 `nomodule` bundle must actually boot
 *      the app. We can't run a 2009-era Kindle WebKit here, so we force the
 *      legacy path by rewriting index.html (drop the module scripts, un-gate the
 *      `nomodule` scripts) and confirm the SystemJS/ES5 bundle renders the app.
 *
 * Usage:
 *   1. bun run build            # inside apps/dorkroom (produces dist/)
 *   2. bun run scripts/verify-legacy-build.ts
 *
 * Exits non-zero on any failed assertion so it can gate CI.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, type ConsoleMessage, chromium } from 'playwright';

const root = join(dirname(import.meta.url), '..');
const distDir = join(root, 'apps', 'dorkroom', 'dist');

function dirname(metaUrl: string): string {
  return join(fileURLToPath(metaUrl), '..');
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Minimal static file server rooted at dist/, with SPA fallback to index.html.
 * `transformHtml`, if given, rewrites any HTML response before sending — used by
 * --serve-legacy to force the `nomodule` path so Chrome runs the ES5 bundle.
 */
function startStaticServer(transformHtml?: (html: string) => string): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
      // Resolve within distDir; reject path traversal.
      const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
      let filePath = join(distDir, rel);
      let body: Buffer;
      try {
        body = await readFile(
          filePath === distDir ? join(distDir, 'index.html') : filePath
        );
      } catch {
        // Asset-like requests that miss are genuine 404s — never SPA-fallback a
        // JS/CSS/asset path to index.html, or the browser parses HTML as JS.
        if (/\.[a-z0-9]+$/i.test(rel) && !rel.endsWith('.html')) {
          console.warn(`  [404] ${urlPath}`);
          res.writeHead(404, { 'content-type': 'text/plain' });
          res.end('Not found');
          return;
        }
        // SPA fallback — unknown navigation route serves index.html.
        filePath = join(distDir, 'index.html');
        body = await readFile(filePath);
      }
      const isHtml = extname(filePath) === '.html';
      if (isHtml && transformHtml)
        body = Buffer.from(transformHtml(body.toString('utf8')));
      res.writeHead(200, {
        'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

/** Rewrite index.html to force the `nomodule` legacy path to execute. */
function forceLegacyHtml(html: string): string {
  return (
    html
      // Drop the modern module entry + the inline module feature-detection scripts.
      .replace(/<script\b[^>]*\btype="module"[^>]*>[\s\S]*?<\/script>/gi, '')
      // Drop modulepreload hints for the modern chunks.
      .replace(/<link\b[^>]*\brel="modulepreload"[^>]*>/gi, '')
      // Un-gate the nomodule scripts so this modern engine runs them.
      .replace(/\snomodule/gi, '')
  );
}

type Errors = string[];

function attachErrorCollectors(
  page: import('playwright').Page,
  errors: Errors,
  ignore: RegExp[] = []
): void {
  page.on('pageerror', (e) => {
    if (!ignore.some((re) => re.test(e.message)))
      errors.push(`pageerror: ${e.message}`);
  });
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    // Match ignore patterns against both the message and its source URL — a
    // failed-resource console error carries the URL only in location().
    const subject = `${msg.text()} ${msg.location()?.url ?? ''}`;
    if (!ignore.some((re) => re.test(subject)))
      errors.push(`console.error: ${msg.text()}`);
  });
}

const assertions: { name: string; pass: boolean; detail?: string }[] = [];
function check(name: string, pass: boolean, detail?: string): void {
  assertions.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function run(browser: Browser, baseUrl: string): Promise<void> {
  // ---- 1. MODERN PATH ------------------------------------------------------
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const requests: string[] = [];
    const errors: Errors = [];
    page.on('request', (r) => requests.push(r.url()));
    // /_vercel/* analytics scripts only exist on the deployed platform; their
    // 404s here are environmental, not a legacy-build defect.
    attachErrorCollectors(page, errors, [/_vercel\//]);

    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60_000 });
    await page
      .locator('.hero-card')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });

    const assetJs = requests.filter((u) => /\/assets\/.*\.js(\?|$)/.test(u));
    const modernEntry = assetJs.some(
      (u) => /\/assets\/index-[^/]+\.js/.test(u) && !u.includes('-legacy-')
    );
    const anyLegacy = assetJs.filter((u) =>
      /-legacy-|polyfills-legacy/.test(u)
    );

    check('modern: app renders (.hero-card visible)', true);
    check('modern: loads modern index-*.js module bundle', modernEntry);
    check(
      'modern: does NOT request any legacy/polyfill chunk',
      anyLegacy.length === 0,
      anyLegacy.length
        ? anyLegacy.map((u) => u.split('/').pop()).join(', ')
        : 'none'
    );
    check(
      'modern: no console/page errors',
      errors.length === 0,
      errors.join(' | ')
    );

    await ctx.close();
  }

  // ---- 2. LEGACY PATH ------------------------------------------------------
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const requests: string[] = [];
    // Vite prints a benign warning telling users to ignore the legacy syntax
    // error; not applicable here (we removed the detector) but ignore defensively.
    const errors: Errors = [];
    attachErrorCollectors(page, errors, [
      /loading legacy chunks/i,
      /_vercel\//,
    ]);

    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'document') {
        const res = await route.fetch();
        const html = await res.text();
        await route.fulfill({
          response: res,
          body: forceLegacyHtml(html),
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      } else {
        await route.continue();
      }
    });
    page.on('request', (r) => requests.push(r.url()));

    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60_000 });
    await page
      .locator('.hero-card')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });

    const loadedPolyfills = requests.some((u) =>
      /polyfills-legacy-[^/]+\.js/.test(u)
    );
    const loadedLegacyEntry = requests.some((u) =>
      /index-legacy-[^/]+\.js/.test(u)
    );
    const loadedModern = requests.some(
      (u) => /\/assets\/index-[^/]+\.js/.test(u) && !u.includes('-legacy-')
    );

    check(
      'legacy: ES5 nomodule bundle boots the app (.hero-card visible)',
      true
    );
    check('legacy: requested polyfills-legacy chunk', loadedPolyfills);
    check(
      'legacy: requested index-legacy chunk (via SystemJS)',
      loadedLegacyEntry
    );
    check('legacy: did NOT load the modern bundle', !loadedModern);
    check(
      'legacy: no console/page errors',
      errors.length === 0,
      errors.join(' | ')
    );

    await ctx.close();
  }
}

// --serve-legacy: don't run the headless checks — instead serve the build with
// index.html rewritten to the forced-legacy (`nomodule`) form and stay up, so
// you can open it in Chrome and interact with the real ES5/SystemJS bundle.
if (process.argv.includes('--serve-legacy')) {
  const { url } = await startStaticServer(forceLegacyHtml);
  console.log(
    `\nLegacy (nomodule/ES5) build is being served at:\n\n  ${url}\n`
  );
  console.log('Open that URL in Chrome. The page now runs the ES5 SystemJS');
  console.log(
    'bundle the Kindle would use. In DevTools → Network you should see'
  );
  console.log(
    'polyfills-legacy-*.js and index-legacy-*.js load (no index-*.js'
  );
  console.log('module bundle). Press Ctrl+C to stop.\n');
  // Keep the process alive until interrupted.
  await new Promise(() => {});
}

const { url, close } = await startStaticServer();
const browser = await chromium.launch();
try {
  console.log(`Serving ${distDir}\n  at ${url}\n`);
  await run(browser, url);
} finally {
  await browser.close();
  await close();
}

const failed = assertions.filter((a) => !a.pass);
console.log(
  `\n${assertions.length - failed.length}/${assertions.length} checks passed`
);
if (failed.length) {
  console.error(
    `\nFAILED:\n${failed.map((a) => `  - ${a.name}${a.detail ? ` (${a.detail})` : ''}`).join('\n')}`
  );
  process.exit(1);
}
console.log('Legacy build verification passed.');
