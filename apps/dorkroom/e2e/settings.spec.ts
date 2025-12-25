import { expect, test } from '@chromatic-com/playwright';
import { devices } from '@playwright/test';

// biome-ignore lint/style/noNonNullAssertion: Well-known Playwright device descriptors always have viewport
const MOBILE_VIEWPORT = devices['iPhone SE'].viewport!;
// biome-ignore lint/style/noNonNullAssertion: Well-known Playwright device descriptors always have viewport
const TABLET_VIEWPORT = devices['iPad Mini'].viewport!;

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
