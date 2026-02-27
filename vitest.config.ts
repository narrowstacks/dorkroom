/// <reference types='vitest' />

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/*/vite.config.{mjs,js,ts,mts}',
      'packages/*/vite.config.{mjs,js,ts,mts}',
      {
        test: {
          name: 'serverless',
          watch: false,
          globals: true,
          environment: 'node',
          include: [
            'api/__tests__/**/*.{test,spec}.ts',
            'utils/__tests__/withHandler.{test,spec}.ts',
            'utils/__tests__/queryValidation.{test,spec}.ts',
          ],
          exclude: ['utils/__tests__/presetSharing.{test,spec}.ts'],
          reporters: ['default'],
          pool: 'forks',
          mockReset: true,
        },
      },
    ],
  },
});
