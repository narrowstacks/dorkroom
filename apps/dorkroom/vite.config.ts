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

/** Injects a <link rel="preload"> for the Latin Montserrat woff2 so the browser
 *  starts downloading it before CSS is parsed. Vite resolves the bare-module
 *  path and rewrites it to the hashed output path during build. */
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

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/dorkroom',
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
    legacyEs5Plugin(),
    fontPreloadPlugin(),
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
          if (
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
          if (id.includes('node_modules/zod/')) {
            return 'zod';
          }
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
