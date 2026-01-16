import { expect, test } from '@chromatic-com/playwright';
import { devices } from '@playwright/test';

const MOBILE_VIEWPORT = devices['iPhone SE'].viewport;
const TABLET_VIEWPORT = devices['iPad Mini'].viewport;

test.describe('Stops Calculator', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/stops');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Stops Calculator/i);

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Exposure Stop Calculator/i);
  });

  test('has calculator inputs', async ({ page }) => {
    await page.goto('/stops');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('has stop adjustment buttons', async ({ page }) => {
    await page.goto('/stops');
    await page.waitForLoadState('networkidle');

    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible();
  });

  test('responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/stops');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('responsive - tablet viewport', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/stops');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});
