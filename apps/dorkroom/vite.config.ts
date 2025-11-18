/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import { resolve } from 'path';

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
        rewrite: (path) => path.replace(/^\/api\/filmdev/, '/api'),
        secure: true,
      },
    },
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [TanStackRouterVite(), react(), nxViteTsPaths()],
  resolve: {
    alias: {
      '@dorkroom/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@dorkroom/logic': resolve(
        __dirname,
        '../../packages/logic/src/index.ts'
      ),
      '@dorkroom/api': resolve(__dirname, '../../packages/api/src/index.ts'),
    },
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
        manualChunks: {
          // Separate vendor chunk for React and TanStack Router
          'react-vendor': ['react', 'react-dom', '@tanstack/react-router'],
          // Separate chunk for Lucide icons
          'lucide-icons': ['lucide-react'],
          // Separate chunk for logic/hooks
          'logic-hooks': ['@dorkroom/logic'],
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
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
