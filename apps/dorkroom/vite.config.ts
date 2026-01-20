/// <reference types='vitest' />

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/dorkroom',
  server: {
    port: 4200,
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
    },
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  plugins: [TanStackRouterVite(), react()],
  resolve: {
    alias: {
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
    rollupOptions: {
      output: {
        // NOTE: Console/debugger dropping is not yet supported in rolldown-vite
        // See: https://github.com/vitejs/rolldown-vite/discussions/302
        // Rolldown removes debugger statements by default; console dropping
        // will be available via build.rollupOptions.minify once implemented
        // Tracking issue: https://github.com/rolldown/rolldown/issues/3637

        // Rolldown uses advancedChunks instead of manualChunks
        advancedChunks: {
          groups: [
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|@tanstack[\\/]react-router)[\\/]/,
            },
            {
              name: 'lucide-icons',
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            },
            {
              name: 'logic-hooks',
              test: /[\\/]packages[\\/]logic[\\/]/,
            },
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase slightly to reduce noise while we optimize
  },
  test: {
    name: '@dorkroom/dorkroom',
    watch: false,
    globals: true,
    environment: 'jsdom',
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
