import { expect, test } from '@chromatic-com/playwright';
import { devices } from '@playwright/test';

// Runtime checks ensure type safety - these devices are guaranteed to have viewports
const MOBILE_VIEWPORT = devices['iPhone SE'].viewport;
const TABLET_VIEWPORT = devices['iPad Mini'].viewport;
if (!MOBILE_VIEWPORT || !TABLET_VIEWPORT) {
  throw new Error('Missing viewport configuration for test devices');
}

test.describe('Films Database', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/films');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Film Database/i);

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Film Database/i);
  });

  test('has search functionality', async ({ page }) => {
    await page.goto('/films');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('displays film results', async ({ page }) => {
    await page.goto('/films');
    await page.waitForLoadState('networkidle');

    const filmResults = page.locator('[role="button"], [role="listitem"]');
    await expect(filmResults.first()).toBeVisible({ timeout: 10000 });
  });

  test('responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/films');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('responsive - tablet viewport', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/films');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});
