/// <reference types='vitest' />

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tanstackRouter } from '@tanstack/router-vite-plugin';
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

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/dorkroom',
  server: {
    port: Number(process.env.PORT) || 4200,
    host: 'localhost',
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
    port: 4300,
    host: 'localhost',
    // Fail fast instead of silently falling back to another port — the
    // screenshot workflow probes this exact port.
    strictPort: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  plugins: [
    tanstackRouter(),
    react(),
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
