/**
 * Playwright configuration for E2E and visual regression testing.
 *
 * Note: defineConfig and devices come from @playwright/test (config utilities),
 * while test files use @chromatic-com/playwright for test/expect (enables Chromatic integration).
 * This is the intended setup per Chromatic's documentation.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    actionTimeout: 10 * 1000, // 10s per action (default 30s is too long for simple nav)
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  // Snapshots are platform-specific. In CI, ensure consistent platform.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
});
