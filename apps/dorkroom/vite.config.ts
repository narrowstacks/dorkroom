/// <reference types='vitest' />

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tanstackRouter } from '@tanstack/router-vite-plugin';
import { microfrontends } from '@vercel/microfrontends/experimental/vite';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { classicInlineScripts, es5SyntaxProblem } from './es5-syntax';
import {
  buildLegacyCss,
  gateModernAssets,
  legacyCssFileName,
  legacyCssLeftovers,
  legacyCssProblem,
} from './legacy-css';

/** Single source of truth for the `legacy()` plugin and `lowerToEs5`. */
const LEGACY_TARGETS = ['ie >= 11', 'safari >= 5'];

/** Babel down-levels `code` to the legacy targets, then terser re-minifies it
 *  as ES5. Only the polyfill chunk needs this: plugin-legacy builds it in a
 *  nested Vite build this config cannot reach, and that build leaves
 *  rolldown's arrow-function runtime helpers and oxc's template literals in. */
async function lowerToEs5(code: string): Promise<string> {
  const { transformAsync } = await import('@babel/core');
  const { minify } = await import('terser');
  const lowered = await transformAsync(code, {
    babelrc: false,
    configFile: false,
    sourceType: 'script',
    compact: true,
    presets: [
      [
        createRequire(import.meta.url).resolve('@babel/preset-env'),
        {
          targets: LEGACY_TARGETS,
          modules: false,
          // core-js advises against Babel's typeof-Symbol helper over its
          // own Symbol polyfill, and the polyfill chunk is core-js.
          exclude: ['transform-typeof-symbol'],
        },
      ],
    ],
  });
  if (!lowered?.code) throw new Error('Babel returned no code');
  const minified = await minify(lowered.code, { ecma: 5, safari10: true });
  if (!minified.code) throw new Error('terser returned no code');
  return minified.code;
}

/** Keeps every `*-legacy-*` chunk ES5 (issue #49), and fails the build if one
 *  is not. Since Vite 8.1.4, plugin-legacy minifies legacy chunks with oxc at
 *  an ES2015 floor, which turns strings into template literals, and its
 *  polyfill chunk carries rolldown's arrow-function runtime. ES5-only engines
 *  (the Kindle browser) cannot parse either, so the app never boots there.
 *  1. Turning rolldown's minifier off for the legacy output hands those chunks
 *     to Vite's terser path, which prints ES5. The modern output keeps oxc.
 *  2. The polyfill chunk is lowered (`lowerToEs5`) and renamed with a hash of
 *     its new content. Its old hash covered the pre-lowering code, and
 *     `/assets/*` is cached immutably, so keeping the name would leave
 *     browsers on the broken copy they already have.
 *     The rename emits no sourcemap: `build.sourcemap` is off today, and
 *     turning it on would need the polyfill map regenerated here too.
 *  3. Every legacy chunk is then parsed as ES5.
 *  This is hygiene, not full support for ES5-only engines: the app also needs
 *  Proxy (TanStack Query), AbortController, fetch and CSS custom properties,
 *  none of which core-js provides, so pre-5.16.4 Kindles (old WebKit) stay
 *  unsupported. Newer Kindles run Chromium 80 (Silk), which parses ES2015+. */
function legacyEs5Plugin(): Plugin {
  const renamed = new Map<string, string>();
  return {
    name: 'legacy-es5',
    apply: 'build',
    outputOptions(options) {
      // plugin-legacy's name for legacy entries when none is configured. If
      // that ever changes, this stops matching and step 3 fails the build.
      if (options.entryFileNames !== 'assets/[name]-legacy-[hash].js') {
        return null;
      }
      return { ...options, minify: false };
    },
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        const problems: string[] = [];
        for (const output of Object.values(bundle)) {
          if (output.type !== 'chunk' || !output.fileName.includes('-legacy')) {
            continue;
          }
          let { code, fileName } = output;
          if (output.name === 'polyfills' && es5SyntaxProblem(code)) {
            code = await lowerToEs5(code);
            const hash = createHash('sha256')
              .update(code)
              .digest('base64url')
              .slice(0, 8);
            fileName = fileName.replace(
              /[^/]+$/,
              `polyfills-legacy-${hash}.js`
            );
            renamed.set(output.fileName, fileName);
            delete bundle[output.fileName];
            this.emitFile({
              type: 'prebuilt-chunk',
              fileName,
              code,
              exports: [],
            });
          }
          const problem = es5SyntaxProblem(code);
          if (problem) problems.push(`${fileName}: ${problem}`);
        }
        // index.html lands in the modern output, after the legacy one. Its
        // classic (non-module) inline scripts run in ES5 engines too.
        for (const output of Object.values(bundle)) {
          if (output.type !== 'asset' || !output.fileName.endsWith('.html')) {
            continue;
          }
          let html = String(output.source);
          for (const [from, to] of renamed) html = html.replaceAll(from, to);
          output.source = html;
          for (const script of classicInlineScripts(html)) {
            const problem = es5SyntaxProblem(script);
            if (problem) problems.push(`${output.fileName} script: ${problem}`);
          }
        }
        if (problems.length > 0) {
          this.error(
            `Legacy chunks are not ES5, so ES5-only browsers (the Kindle, ` +
              `issue #49) cannot parse them:\n  ${problems.join('\n  ')}`
          );
        }
      },
    },
  };
}

/** Emits a Chromium 80 copy of the app stylesheet for browsers without
 *  cascade layers (issue #49). Kindle Silk (Chromium 80) runs the legacy JS
 *  bundle, but Tailwind 4's CSS needs Chrome 111+: `@layer` blocks are dropped
 *  before Chrome 99, and `color-mix()` needs 111, so the page renders mostly
 *  unstyled. See legacy-css.ts for the rewrite. Fails the build if the copy
 *  still has `@layer` or `color-mix()`. `legacyGatePlugin` wires it in. */
function legacyCssPlugin(): Plugin {
  return {
    name: 'legacy-css',
    apply: 'build',
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        const html = Object.values(bundle).find(
          (output) =>
            output.type === 'asset' && output.fileName === 'index.html'
        );
        if (html?.type !== 'asset') return;
        const css = Object.values(bundle).filter(
          (output) =>
            output.type === 'asset' && output.fileName.endsWith('.css')
        );
        // One stylesheet today. A split one (lazy CSS chunks) would load
        // through JS and skip the swap, so stop rather than ship it half done.
        if (css.length !== 1 || css[0]?.type !== 'asset') {
          this.error(
            `legacy-css expects exactly one CSS asset, found ` +
              `${css.length}: ${css.map((c) => c.fileName).join(', ')}`
          );
        }
        const modern = css[0];
        const source = String(modern.source);
        const { css: legacyCss, report } = await buildLegacyCss(source);
        const problem = legacyCssProblem(legacyCss);
        if (problem) {
          this.error(
            `The legacy stylesheet ${problem}, so Chromium 80 (Kindle Silk, ` +
              `issue #49) would drop those rules.`
          );
        }
        for (const dropped of report.dropped) {
          this.info(`legacy-css: dropped non-static color-mix(): ${dropped}`);
        }
        const leftovers = [...legacyCssLeftovers(legacyCss)]
          .map(([name, count]) => `${name} ${count}`)
          .join(', ');
        this.info(
          `legacy-css: left for Chromium 80 to ignore (degrades gracefully): ${leftovers}`
        );
        const fileName = legacyCssFileName(modern.fileName, legacyCss);
        this.emitFile({ type: 'asset', fileName, source: legacyCss });
      },
    },
  };
}

/** Takes the modern entry `<script type=module src>`, its modulepreloads and
 *  the app stylesheet out of index.html and puts one classic inline script in
 *  their place, which writes them back in browsers with cascade layers and
 *  writes only the legacy stylesheet in the rest (issue #644,
 *  `legacyGateScript` in legacy-css.ts). Legacy browsers (Kindle Silk) used to
 *  download and instantiate the whole modern graph and the modern CSS, only
 *  for plugin-legacy's guard to throw them away.
 *
 *  Modern browsers get the same tags in the same order; the only difference
 *  is that the preload scanner cannot see them, so they are discovered when
 *  the parser runs the script (about 3 KB in, after the inline app-shell
 *  `<style>`; nothing before it blocks the parser).
 *  plugin-legacy's inline module scripts and its `nomodule` scripts stay in
 *  the markup: in a legacy browser its fallback loads SystemJS and the
 *  legacy entry, as before. Runs after `legacyCssPlugin` (which emits the
 *  legacy stylesheet) and before `legacyEs5Plugin` (which parses the script
 *  as ES5). Fails the build if the markup is not the shape it expects. */
function legacyGatePlugin(): Plugin {
  return {
    name: 'legacy-gate',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const html = bundle['index.html'];
        if (html?.type !== 'asset') return;
        const css = Object.values(bundle).filter(
          (output) =>
            output.type === 'asset' && output.fileName.endsWith('.css')
        );
        const modern = css.find((c) => !c.fileName.includes('-legacy-'));
        const legacyCss = css.find((c) => c.fileName.includes('-legacy-'));
        if (css.length !== 2 || !modern || !legacyCss) {
          this.error(
            `legacy-gate expects the app stylesheet and its legacy copy, ` +
              `found: ${css.map((c) => c.fileName).join(', ')}`
          );
        }
        try {
          html.source = gateModernAssets(
            String(html.source),
            `/${modern.fileName}`,
            `/${legacyCss.fileName}`
          );
        } catch (err) {
          this.error(
            `legacy-gate: cannot gate the modern assets in index.html: ` +
              (err instanceof Error ? err.message : String(err))
          );
        }
      },
    },
  };
}

/** Injects a <link rel="preload"> for the Latin Montserrat woff2 so the browser
 *  starts downloading it before CSS is parsed. Vite resolves the bare-module
 *  path and rewrites it to the hashed output path during build. The tag stays
 *  in the markup, outside the `legacyGatePlugin` script, so the preload
 *  scanner still finds it, and the legacy stylesheet uses the same font file,
 *  so legacy browsers use the preload too. */
function fontPreloadPlugin(): Plugin {
  return {
    name: 'font-preload',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        // Only inject during build — dev server serves fonts on demand
        if (!ctx.bundle) return [];
        // Find the hashed Montserrat Latin font file in the bundle
        const fontAsset = Object.keys(ctx.bundle).find(
          (key) =>
            key.includes('montserrat-latin-wght-normal') &&
            key.endsWith('.woff2')
        );
        if (!fontAsset) return [];
        return [
          {
            tag: 'link',
            attrs: {
              rel: 'preload',
              href: `/${fontAsset}`,
              as: 'font',
              type: 'font/woff2',
              crossorigin: '',
            },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

/** Packages that only lazy pages use. If the entry chunk reaches one of them
 *  through static imports, `index.html` modulepreloads it and every page pays
 *  for it before first render (issue #352: ~35 KB gzip of zod and TanStack
 *  Form on the home page). */
const LAZY_ONLY_PACKAGES = [
  '/node_modules/zod/',
  '/node_modules/@tanstack/form-core/',
  '/node_modules/@tanstack/react-form/',
];

/** Fails the build when the modern entry's static import graph (what
 *  `index.html` modulepreloads, through the `legacyGatePlugin` script)
 *  contains a lazy-only package. The legacy
 *  output (`*-legacy-*` chunks, SystemJS behind `nomodule`) is skipped: it
 *  has no modulepreload list. */
function initialChunkGuardPlugin(): Plugin {
  return {
    name: 'initial-chunk-guard',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = new Map<string, { imports: string[]; ids: string[] }>();
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          chunks.set(output.fileName, {
            imports: output.imports,
            ids: output.moduleIds,
          });
        }
      }
      const initial = new Set<string>();
      const queue = Object.values(bundle).flatMap((output) =>
        output.type === 'chunk' &&
        output.isEntry &&
        !output.fileName.includes('-legacy')
          ? [output.fileName]
          : []
      );
      for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
        if (initial.has(file)) continue;
        initial.add(file);
        queue.push(...(chunks.get(file)?.imports ?? []));
      }
      const offenders = [...initial].flatMap((file) => {
        const ids = chunks.get(file)?.ids ?? [];
        return LAZY_ONLY_PACKAGES.filter((pkg) =>
          ids.some((id) => id.replaceAll('\\', '/').includes(pkg))
        ).map((pkg) => `${file} contains ${pkg}`);
      });
      if (offenders.length > 0) {
        this.error(
          `Lazy-only packages reached the initial chunks, so every page would ` +
            `preload them (issue #352):\n  ${offenders.join('\n  ')}\n` +
            `Import them from a lazy page, not from code the route tree or ` +
            `main.tsx loads.`
        );
      }
    },
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/dorkroom',
  define: {
    // True only in a build running on Vercel, which sets VERCEL=1 (it must be
    // declared in turbo.json's build `env`, or strict env mode drops it). Gates
    // features that exist only on a Vercel deployment, such as `/_vercel/image`.
    __VERCEL__: JSON.stringify(process.env.VERCEL === '1'),
  },
  server: {
    // No `port` here on purpose. The @vercel/microfrontends plugin's `config()`
    // hook sets `server.port` (and `preview.port`) from a hash of the package
    // name, and a plugin's returned config wins over the user config — so any
    // port set here is silently ignored. `bun run dev` currently lands on 4503;
    // read the real port off Vite's startup banner rather than assuming one. To
    // pin it, set MFE_APP_PORT, which the plugin honours ahead of the hash.
    host: 'localhost',
    // Vite rejects any request whose Host header is not an IP or localhost, as
    // DNS-rebinding protection. That makes the dev server unreachable *by name*
    // from another machine even though this package's dev script binds it to
    // 0.0.0.0 — the request 403s with "Blocked request. This host is not
    // allowed." Raw IPs are always allowed; this entry additionally opens up
    // Tailscale MagicDNS names on any tailnet. Bare short names
    // (`http://devbox:4503`) stay blocked — use the FQDN or the IP.
    allowedHosts: ['.ts.net'],
    proxy: {
      '/api/filmdev': {
        target: 'https://filmdev.org',
        changeOrigin: true,
        // Rewrite /api/filmdev?id=123 to /api/recipe/123
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const id = url.searchParams.get('id');
          return id ? `/api/recipe/${id}` : '/api';
        },
        secure: true,
      },
      '/api': {
        target: 'https://dorkroom.art',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    host: 'localhost',
    // Fail fast instead of silently falling back to another port. The port
    // itself comes from the microfrontends plugin (see `server` above), which
    // is why the screenshot workflow parses it out of Vite's startup banner
    // instead of hardcoding one.
    strictPort: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  plugins: [
    tanstackRouter(),
    react(),
    // Scopes this (default) app's static assets under the microfrontends group
    // so the edge can keep `/docs/*` asset requests routed to the docs child app
    // rather than this app swallowing them. Reads the co-located microfrontends.json
    // in this package dir (Turborepo's MFE integration requires it here, not the
    // repo root — a root config makes turbo self-extend `//` and the build fails).
    // Build-only: the root vitest.config loads this file from the repo root, where
    // the plugin would resolve the wrong package name (@dorkroom/source) and throw.
    process.env.VITEST ? undefined : microfrontends(),
    // Legacy bundle for the Kindle Experimental Browser, which is WebKit ~2009
    // (Safari 4–5 era): ES5-only, no Promise/async. The `ie >= 11` floor forces
    // Babel to fully down-level the legacy chunks to ES5 and inject the core-js
    // polyfills the Kindle lacks (Promise, etc.); `safari >= 5` documents the
    // real-world target. Modern browsers never load this — it sits behind
    // `nomodule`, so there is zero impact on the modern ES-module bundle.
    legacy({
      targets: LEGACY_TARGETS,
      // Polyfill the bare globals the Kindle's ancient engine is missing even
      // before app code runs (the usage scan covers the rest).
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
    legacyCssPlugin(),
    legacyGatePlugin(),
    legacyEs5Plugin(),
    fontPreloadPlugin(),
    initialChunkGuardPlugin(),
  ],
  resolve: {
    alias: {
      '@dorkroom/ui/forms': resolve(
        __dirname,
        '../../packages/ui/src/forms/index.ts'
      ),
      '@dorkroom/ui/calculator': resolve(
        __dirname,
        '../../packages/ui/src/calculator.ts'
      ),
      '@dorkroom/ui/border-calculator': resolve(
        __dirname,
        '../../packages/ui/src/border-calculator.ts'
      ),
      '@dorkroom/ui/development-recipes': resolve(
        __dirname,
        '../../packages/ui/src/development-recipes.ts'
      ),
      '@dorkroom/ui/films': resolve(
        __dirname,
        '../../packages/ui/src/films.ts'
      ),
      '@dorkroom/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@dorkroom/logic': resolve(
        __dirname,
        '../../packages/logic/src/index.ts'
      ),
      '@dorkroom/api': resolve(__dirname, '../../packages/api/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // A user-provided output.minify object overrides Vite 8's default, so the
    // full config is spelled out; compress.drop* replaces the removed esbuild.drop.
    // The modern bundle keeps oxc minify. The legacy chunks go to terser
    // (legacyEs5Plugin), which reads only `terserOptions`; it drops console and
    // debugger statements the same way.
    minify: 'oxc',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      output: {
        minify: {
          mangle: true,
          codegen: true,
          compress: { dropConsole: true, dropDebugger: true },
        },
        manualChunks(id) {
          // The modern build targets es2020 (plugin-legacy's floor), so the
          // `#private` fields in query-core and form-core are down-levelled to
          // oxc runtime helpers. Left alone, those helpers land in whichever
          // manual chunk claims them first (`tanstack-form`), and the entry's
          // QueryClient then modulepreloads that whole chunk on every page
          // (issue #352). Keep them with the vendor code every page loads.
          if (
            id.includes('@oxc-project+runtime') ||
            id.includes('@oxc-project/runtime') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/@tanstack/react-router/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide-icons';
          }
          if (id.includes('node_modules/@tanstack/react-form/')) {
            return 'tanstack-form';
          }
          if (
            id.includes('node_modules/@tanstack/react-table/') ||
            id.includes('node_modules/@tanstack/react-virtual/')
          ) {
            return 'tanstack-table-virtual';
          }
          // No manual chunk for zod: a forced chunk holding every zod file
          // makes any small zod import in the entry preload all of it (issue
          // #352). Rolldown's own splitting keeps zod with the lazy pages that
          // use it; the route schemas (search-schemas.ts) use no zod at all.
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase slightly to reduce noise while we optimize
  },
  test: {
    name: '@dorkroom/dorkroom',
    watch: false,
    globals: true,
    environment: 'happy-dom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    reporters: ['default'],
    pool: 'forks',
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
