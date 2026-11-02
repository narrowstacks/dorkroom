/// <reference types='vitest' />

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tanstackRouter } from '@tanstack/router-vite-plugin';
import { microfrontends } from '@vercel/microfrontends/experimental/vite';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

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
 *  `index.html` modulepreloads) contains a lazy-only package. The legacy
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
      targets: ['ie >= 11', 'safari >= 5'],
      // Polyfill the bare globals the Kindle's ancient engine is missing even
      // before app code runs (the usage scan covers the rest).
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
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
    // The modern bundle keeps oxc minify (fast, unchanged from before); the
    // legacy plugin minifies its separate legacy chunks with terser automatically.
    minify: 'oxc',
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
