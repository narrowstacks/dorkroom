/// <reference types='vitest' />
import { defineConfig as defineViteConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { resolve } from 'path';
import module from 'module';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const NodeModule = (module as unknown as { Module: typeof module.Module }).Module;
if (NodeModule?.prototype?.require) {
  const originalRequire = NodeModule.prototype.require;
  NodeModule.prototype.require = function (request: string, ...args: unknown[]) {
    if (request === 'fumadocs-core/mdx-plugins') {
      return originalRequire.call(
        this,
        resolve(__dirname, '../../node_modules/fumadocs-core/dist/mdx-plugins/index.js'),
        ...args
      );
    }
    return originalRequire.call(this, request, ...args);
  };
}

export default defineViteConfig(async () => {
  const [{ default: mdx }, { defineDocs }] = await Promise.all([
    import('fumadocs-mdx/vite'),
    import('fumadocs-mdx/config'),
  ]);
  const docsCollection = defineDocs({
    name: 'docs',
    dir: 'content/docs',
  });
  const fumadocs = mdx(
    {
      docs: docsCollection,
    },
    {
      generateIndexFile: false,
    }
  );

  return {
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
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
    plugins: [fumadocs, react(), nxViteTsPaths()],
  optimizeDeps: {
    exclude: ['fumadocs-core', 'fumadocs-ui'],
  },
  resolve: {
    alias: {
      '@dorkroom/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@dorkroom/logic': resolve(
        __dirname,
        '../../packages/logic/dist/index.js'
      ),
      '@dorkroom/api': resolve(__dirname, '../../packages/api/dist/index.js'),
      'fumadocs-core/mdx-plugins': resolve(
        __dirname,
        '../../node_modules/fumadocs-core/dist/mdx-plugins/index.js'
      ),
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
          // Separate vendor chunk for React and React Router
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Separate chunk for Lucide icons
          'lucide-icons': ['lucide-react'],
          // Separate chunk for internal UI components
          'ui-components': ['@dorkroom/ui'],
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
  };
});
