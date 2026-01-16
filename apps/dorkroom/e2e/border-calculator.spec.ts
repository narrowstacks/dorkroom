import { expect, test } from '@chromatic-com/playwright';
import { devices } from '@playwright/test';

const MOBILE_VIEWPORT = devices['iPhone SE'].viewport;
const TABLET_VIEWPORT = devices['iPad Mini'].viewport;

test.describe('Border Calculator', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/border');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Border Calculator/i);

    const inputs = page.locator('input[type="number"], input[type="text"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('has input fields', async ({ page }) => {
    await page.goto('/border');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input[type="number"], input[type="text"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/border');
    await page.waitForLoadState('networkidle');

    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('responsive - tablet viewport', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/border');
    await page.waitForLoadState('networkidle');

    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});
