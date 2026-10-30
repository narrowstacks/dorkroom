/**
 * Verify the @vitejs/plugin-legacy dual-bundle output in a real browser
 * (headless Chrome through `Bun.WebView`, see webview-capture.ts).
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
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaptureView } from './webview-capture';

const root = join(dirname(import.meta.url), '..');
const distDir = join(root, 'apps', 'dorkroom', 'dist');

function dirname(metaUrl: string): string {
  return join(fileURLToPath(metaUrl), '..');
}

const MIME = new Map<string, string>([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
  ['.ico', 'image/x-icon'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

/**
 * Minimal static file server rooted at dist/, with SPA fallback to index.html.
 * `transformHtml`, if given, rewrites any HTML response before sending — used by
 * --serve-legacy to force the `nomodule` path so Chrome runs the ES5 bundle.
 */
/**
 * `Server.address()` returns a string for pipe/UDS listeners and an
 * `AddressInfo` for TCP ones, discriminated only by JS representation — so the
 * check belongs in a type guard, which is the parse step for this union.
 */
function isAddressInfo(
  address: string | AddressInfo | null
): address is AddressInfo {
  return typeof address === 'object' && address !== null;
}

function startStaticServer(
  transformHtml?: (html: string) => string,
  requestLog?: string[]
): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
      requestLog?.push(urlPath);
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
        'content-type':
          MIME.get(extname(filePath)) ?? 'application/octet-stream',
      });
      res.end(body);
    } catch (err) {
      // Log the detail server-side; don't reflect the error (which may carry a
      // stack trace or attacker-controlled path) back in the response body.
      console.error('  [500]', err);
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = isAddressInfo(addr) ? addr.port : 0;
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

/** Installed before any page script: collects uncaught errors and console.error calls. */
const ERROR_COLLECTOR = `
  window.__pageErrors = [];
  window.addEventListener('error', function (e) {
    window.__pageErrors.push('pageerror: ' + e.message);
  });
  window.addEventListener('unhandledrejection', function (e) {
    window.__pageErrors.push('unhandledrejection: ' + String(e.reason));
  });
  var origError = console.error;
  console.error = function () {
    window.__pageErrors.push('console.error: ' + Array.prototype.join.call(arguments, ' '));
    return origError.apply(console, arguments);
  };
`;

async function readErrors(
  view: CaptureView,
  ignore: RegExp[]
): Promise<Errors> {
  const all = await view.evaluate<string[]>(
    'function () { return window.__pageErrors || []; }'
  );
  return all.filter((message) => !ignore.some((re) => re.test(message)));
}

const assertions: { name: string; pass: boolean; detail?: string }[] = [];
function check(name: string, pass: boolean, detail?: string): void {
  assertions.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function openAndWait(url: string): Promise<CaptureView> {
  const view = await CaptureView.open({
    width: 1280,
    height: 918,
    initScript: ERROR_COLLECTOR,
  });
  await view.goto(url);
  await view.waitForVisible('.hero-grain', 30_000);
  return view;
}

async function run(): Promise<void> {
  // ---- 1. MODERN PATH ------------------------------------------------------
  {
    const requests: string[] = [];
    const server = await startStaticServer(undefined, requests);
    const view = await openAndWait(server.url);

    const assetJs = requests.filter((u) => /\/assets\/.*\.js$/.test(u));
    const modernEntry = assetJs.some(
      (u) => /\/assets\/index-[^/]+\.js/.test(u) && !u.includes('-legacy-')
    );
    const anyLegacy = assetJs.filter((u) =>
      /-legacy-|polyfills-legacy/.test(u)
    );
    // /_vercel/* analytics scripts only exist on the deployed platform; their
    // 404s here are environmental, not a legacy-build defect.
    const errors = await readErrors(view, [/_vercel\//]);

    check('modern: app renders (.hero-grain visible)', true);
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

    view.close();
    await server.close();
  }

  // ---- 2. LEGACY PATH ------------------------------------------------------
  {
    const requests: string[] = [];
    const server = await startStaticServer(forceLegacyHtml, requests);
    const view = await openAndWait(server.url);
    const errors = await readErrors(view, [
      /loading legacy chunks/i,
      /_vercel\//,
    ]);

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
      'legacy: ES5 nomodule bundle boots the app (.hero-grain visible)',
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

    view.close();
    await server.close();
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

console.log(`Serving ${distDir}\n`);
await run();

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
