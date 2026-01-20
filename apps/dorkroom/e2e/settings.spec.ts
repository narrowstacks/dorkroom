import { expect, test } from '@chromatic-com/playwright';
import { devices } from '@playwright/test';

// Runtime checks ensure type safety - these devices are guaranteed to have viewports
const MOBILE_VIEWPORT = devices['iPhone SE'].viewport;
const TABLET_VIEWPORT = devices['iPad Mini'].viewport;
if (!MOBILE_VIEWPORT || !TABLET_VIEWPORT) {
  throw new Error('Missing viewport configuration for test devices');
}

test.describe('Settings', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Settings/i);

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Settings/i);
  });

  test('has theme options', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible();
  });

  test('responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('responsive - tablet viewport', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});
