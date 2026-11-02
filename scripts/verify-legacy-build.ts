/**
 * Verify the @vitejs/plugin-legacy dual-bundle output in a real browser
 * (headless Chrome through `Bun.WebView`, see webview-capture.ts).
 *
 * Three things must hold for the Kindle-browser support (PR #92) to be both
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
 *      legacy path by rewriting index.html (hide `CSSLayerBlockRule` so the
 *      gate script takes its legacy branch, drop the inline module scripts,
 *      un-gate the `nomodule` scripts) and confirm the SystemJS/ES5 bundle
 *      renders the app with the legacy stylesheet and requests no modern JS
 *      or CSS (issue #644).
 *
 *   3. ES5 SYNTAX: Chrome parses ES2015+, so (2) passes even when the legacy
 *      chunks are not ES5. Every `*-legacy-*.js` file and every classic inline
 *      script in index.html is therefore parsed with acorn at ecmaVersion 5.
 *
 * Usage:
 *   1. bun run build            # inside apps/dorkroom (produces dist/)
 *   2. bun run scripts/verify-legacy-build.ts
 *
 * Exits non-zero on any failed assertion so it can gate CI.
 */
import { readdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classicInlineScripts,
  es5SyntaxProblem,
} from '../apps/dorkroom/es5-syntax';
import {
  KINDLE_UA_SOURCE,
  LEGACY_BROWSER_ATTR,
  legacyCssProblem,
  NO_MOTION_CSS,
} from '../apps/dorkroom/legacy-css';
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
  requestLog?: string[],
  notFoundLog?: string[]
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
          notFoundLog?.push(urlPath);
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

/** Hides cascade-layer support before any page script runs, so the inline
 *  loader takes the branch Kindle Silk (Chromium 80) takes. */
const HIDE_CSS_LAYERS = `
delete window.CSSLayerBlockRule;
window.__layersHidden = typeof window.CSSLayerBlockRule === 'undefined';
`;

/** Rewrite index.html to force the legacy path in this modern engine. */
function forceLegacyHtml(html: string): string {
  return (
    html
      // Hide cascade layers before the gate script runs, so it takes the
      // branch Kindle Silk (Chromium 80) takes: legacy stylesheet only, no
      // modern entry or modulepreloads (issue #644).
      .replace('<head>', `<head><script>${HIDE_CSS_LAYERS}</script>`)
      // Drop the inline module feature-detection scripts, which would pass here.
      .replace(/<script\b[^>]*\btype="module"[^>]*>[\s\S]*?<\/script>/gi, '')
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

async function openAndWait(url: string, extraInit = ''): Promise<CaptureView> {
  const view = await CaptureView.open({
    width: 1280,
    height: 918,
    initScript: ERROR_COLLECTOR + extraInit,
  });
  await view.goto(url);
  await view.waitForVisible('.hero-grain', 30_000);
  return view;
}

/**
 * Legacy chunks must not contain Unicode property escapes (`\p{...}`): the
 * transpiler rewrites them only in regex LITERALS, so a leftover means a
 * `new RegExp('\\p{..}')` string (or an untranspiled literal) that throws a
 * SyntaxError on browsers without property-escape support. Stale chunks left
 * in dist/ can fail this locally: `rm -rf apps/dorkroom/dist` and rebuild.
 */
async function checkLegacyChunksHaveNoPropertyEscapes(): Promise<void> {
  const assetsDir = join(distDir, 'assets');
  const files = (await readdir(assetsDir)).filter((f) =>
    /-legacy-.*\.js$/.test(f)
  );
  check('legacy: found legacy chunks to scan', files.length > 0);
  const offenders: string[] = [];
  for (const file of files) {
    const source = await readFile(join(assetsDir, file), 'utf8');
    // Zod ships its emoji pattern as a string for `z.emoji()` (compiled
    // lazily with `new RegExp`, never called by the app), so those known
    // property names are removed before testing.
    const scanned = source.replace(
      /\\\\p\{(Extended_Pictographic|Regional_Indicator|Emoji_Component)\}/g,
      ''
    );
    // `\\p{` also covers the escaped form inside a string passed to RegExp().
    if (/\\{1,2}[pP]\{/.test(scanned)) offenders.push(file);
  }
  check(
    'legacy: no Unicode property escapes (\\p{...}) in any legacy chunk',
    offenders.length === 0,
    offenders.join(', ')
  );
}

/**
 * Every legacy chunk, and every classic inline script in index.html, must
 * parse as ES5. The headless-Chrome checks below cannot catch an arrow function
 * or a template literal, because Chrome parses both; the Kindle browser does
 * not, and one such token stops the whole bundle (issue #49). The build's
 * `legacy-es5` plugin enforces the same rule; this checks the files on disk.
 */
async function checkLegacyOutputIsEs5(): Promise<void> {
  const assetsDir = join(distDir, 'assets');
  const files = (await readdir(assetsDir)).filter((f) =>
    /-legacy-.*\.js$/.test(f)
  );
  const offenders: string[] = [];
  for (const file of files) {
    const problem = es5SyntaxProblem(
      await readFile(join(assetsDir, file), 'utf8')
    );
    if (problem) offenders.push(`${file}: ${problem}`);
  }
  check(
    'legacy: every legacy chunk parses as ES5',
    files.length > 0 && offenders.length === 0,
    offenders.join(', ')
  );

  const html = await readFile(join(distDir, 'index.html'), 'utf8');
  const scripts = classicInlineScripts(html);
  const htmlOffenders = scripts.flatMap((body, index) => {
    const problem = es5SyntaxProblem(body);
    return problem ? [`inline script ${index + 1}: ${problem}`] : [];
  });
  check(
    'legacy: index.html classic inline scripts parse as ES5',
    htmlOffenders.length === 0,
    htmlOffenders.join(', ')
  );
}

/**
 * The Chromium 80 fallback stylesheet (Kindle Silk) must exist, be free of
 * `@layer` and `color-mix()`, and be wired into index.html through the classic
 * inline script that swaps it in. The build's `legacy-css` plugin enforces the
 * same; this checks the files on disk.
 */
async function checkLegacyCss(): Promise<void> {
  const assetsDir = join(distDir, 'assets');
  const files = (await readdir(assetsDir)).filter((f) =>
    /-legacy-[^/]*\.css$/.test(f)
  );
  check(
    'legacy css: one fallback stylesheet',
    files.length === 1,
    files.join(', ')
  );
  const [file] = files;
  if (!file) return;
  const legacyCss = await readFile(join(assetsDir, file), 'utf8');
  const problem = legacyCssProblem(legacyCss);
  check('legacy css: no @layer or color-mix()', !problem, problem ?? 'clean');
  check(
    'legacy css: ends with the no-motion override',
    legacyCss.endsWith(NO_MOTION_CSS)
  );
  const html = await readFile(join(distDir, 'index.html'), 'utf8');
  check(
    'legacy css: loader themes a Kindle high contrast before first paint',
    classicInlineScripts(html).some(
      (body) =>
        body.includes(KINDLE_UA_SOURCE) &&
        body.includes('setAttribute("data-theme","high-contrast")')
    )
  );
  check(
    'legacy css: loader marks <html> for the app',
    classicInlineScripts(html).some((body) =>
      body.includes(`setAttribute("${LEGACY_BROWSER_ATTR}","")`)
    )
  );
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) =>
    /^<script\b[^>]*\bsrc=/i.test(tag) ? tag : ''
  );
  const ungated = [
    ...markup.matchAll(
      /<script\b[^>]*\btype="module"[^>]*\bsrc=[^>]*>|<link\b[^>]*\brel="(?:modulepreload|stylesheet)"[^>]*>/gi
    ),
  ].map(([tag]) => tag);
  check(
    'gate: no modern entry, modulepreload or stylesheet tag left in the markup',
    ungated.length === 0,
    ungated.join(' ') || 'none'
  );
  check(
    'gate: the classic gate script writes the modern entry, modulepreloads and stylesheet',
    classicInlineScripts(html).some(
      (body) =>
        body.startsWith('window.CSSLayerBlockRule?document.write(') &&
        /type=\\"module\\"[^)]*src=\\"\/assets\/index-[^"\\]+\.js/.test(body) &&
        body.includes('rel=\\"modulepreload\\"') &&
        /rel=\\"stylesheet\\"[^)]*\/assets\/index-(?!legacy)[^"\\]+\.css/.test(
          body
        )
    )
  );
  check(
    'legacy css: index.html writes it in (render-blocking) from a classic inline script',
    classicInlineScripts(html).some(
      (body) =>
        body.includes('CSSLayerBlockRule') &&
        // A parser-inserted link blocks rendering; a changed href does not.
        body.includes('.write(') &&
        !body.includes('.href=') &&
        body.includes(file)
    )
  );
}

async function run(): Promise<void> {
  await checkLegacyOutputIsEs5();
  await checkLegacyCss();
  await checkLegacyChunksHaveNoPropertyEscapes();

  // ---- 1. MODERN PATH ------------------------------------------------------
  {
    const requests: string[] = [];
    const notFound: string[] = [];
    const server = await startStaticServer(undefined, requests, notFound);
    let view: CaptureView | undefined;
    try {
      view = await openAndWait(server.url);

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
        'modern: loads the modern stylesheet and the modulepreloads',
        requests.some((u) => /\/assets\/index-(?!legacy)[^/]+\.css$/.test(u)) &&
          requests.some((u) => /\/assets\/react-vendor-[^/]+\.js$/.test(u))
      );
      const legacyCss = requests.filter((u) => /-legacy-[^/]*\.css$/.test(u));
      check(
        'modern: does NOT request the legacy stylesheet',
        legacyCss.length === 0,
        legacyCss.join(', ') || 'none'
      );
      const missing = notFound.filter((u) => !u.startsWith('/_vercel/'));
      check('modern: no 404s', missing.length === 0, missing.join(', '));
      check(
        'modern: no console/page errors',
        errors.length === 0,
        errors.join(' | ')
      );
    } finally {
      view?.close();
      await server.close();
    }
  }

  // ---- 2. LEGACY PATH ------------------------------------------------------
  {
    const requests: string[] = [];
    const notFound: string[] = [];
    const server = await startStaticServer(forceLegacyHtml, requests, notFound);
    let view: CaptureView | undefined;
    try {
      view = await openAndWait(server.url);
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
      const modernAssets = requests.filter(
        (u) => /\/assets\/[^/]+\.(?:js|css)$/.test(u) && !/-legacy-/.test(u)
      );
      const state = await view.evaluate<{
        hidden: boolean;
        marked: boolean;
        links: string[];
        sheets: string[];
        legacyRules: number;
        font: string;
      }>(`function () {
        var links = [].slice.call(document.querySelectorAll('link[rel=stylesheet]'));
        var sheets = [].slice.call(document.styleSheets).filter(function (s) { return s.href; });
        var legacy = sheets.filter(function (s) { return /-legacy-[^/]*\\.css$/.test(s.href); })[0];
        return {
          hidden: window.__layersHidden === true,
          marked: document.documentElement.hasAttribute('${LEGACY_BROWSER_ATTR}'),
          links: links.map(function (l) { return l.getAttribute('href'); }),
          sheets: sheets.map(function (s) { return s.href.split('/').pop(); }),
          legacyRules: legacy ? legacy.cssRules.length : 0,
          font: getComputedStyle(document.body).fontFamily
        };
      }`);

      check(
        'legacy: ES5 nomodule bundle boots the app (.hero-grain visible)',
        true
      );
      check('legacy: requested polyfills-legacy chunk', loadedPolyfills);
      check(
        'legacy: requested index-legacy chunk (via SystemJS)',
        loadedLegacyEntry
      );
      check(
        'legacy: CSSLayerBlockRule hidden before the gate ran',
        state.hidden
      );
      check(
        'legacy: requested no modern JS or CSS at all (issue #644)',
        modernAssets.length === 0,
        modernAssets.join(', ') || 'none'
      );
      check(
        'legacy: requested the legacy stylesheet',
        requests.some((u) => /-legacy-[^/]*\.css$/.test(u))
      );
      check(
        'legacy: exactly one stylesheet link, the legacy one',
        state.links.length === 1 &&
          /-legacy-[^/]*\.css$/.test(state.links[0] ?? ''),
        state.links.join(', ')
      );
      check(
        'legacy: legacy sheet applied, no modern sheet',
        state.sheets.length === 1 && state.legacyRules > 0,
        `${state.sheets.join(', ')} (${state.legacyRules} rules)`
      );
      check('legacy: <html> marked for the app', state.marked);
      check(
        'legacy: app font applied',
        /Montserrat/.test(state.font),
        state.font
      );
      const missing = notFound.filter((u) => !u.startsWith('/_vercel/'));
      check('legacy: no 404s', missing.length === 0, missing.join(', '));
      check(
        'legacy: no console/page errors',
        errors.length === 0,
        errors.join(' | ')
      );
    } finally {
      view?.close();
      await server.close();
    }
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
