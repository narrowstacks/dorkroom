import { expect, test } from '@chromatic-com/playwright';
import { devices } from '@playwright/test';

// Runtime checks ensure type safety - these devices are guaranteed to have viewports
const MOBILE_VIEWPORT = devices['iPhone SE'].viewport;
const TABLET_VIEWPORT = devices['iPad Mini'].viewport;
if (!MOBILE_VIEWPORT || !TABLET_VIEWPORT) {
  throw new Error('Missing viewport configuration for test devices');
}

test.describe('Resize Calculator', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/resize');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Resize Calculator/i);

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Print Resize Calculator/i);
  });

  test('has calculator inputs', async ({ page }) => {
    await page.goto('/resize');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('has mode toggle', async ({ page }) => {
    await page.goto('/resize');
    await page.waitForLoadState('networkidle');

    const toggle = page.getByText(/Print Size|Enlarger Height/i);
    await expect(toggle.first()).toBeVisible();
  });

  test('responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/resize');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('responsive - tablet viewport', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/resize');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});
