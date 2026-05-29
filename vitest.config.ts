/// <reference types='vitest' />

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest 4 moved `pool`, `reporters`, and `watch` to root-only options;
    // they can no longer live inside a per-project `test` config.
    pool: 'forks',
    reporters: ['default'],
    projects: [
      'apps/*/vite.config.{mjs,js,ts,mts}',
      'packages/*/vite.config.{mjs,js,ts,mts}',
      {
        test: {
          name: 'serverless',
          globals: true,
          environment: 'node',
          include: [
            'api/__tests__/**/*.{test,spec}.ts',
            'utils/__tests__/withHandler.{test,spec}.ts',
            'utils/__tests__/queryValidation.{test,spec}.ts',
            'utils/__tests__/routeMetadata.{test,spec}.ts',
          ],
          exclude: ['utils/__tests__/presetSharing.{test,spec}.ts'],
          mockReset: true,
        },
      },
    ],
  },
});
