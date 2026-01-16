import { expect, test } from '@chromatic-com/playwright';
import { devices } from '@playwright/test';

const MOBILE_VIEWPORT = devices['iPhone SE'].viewport;
const TABLET_VIEWPORT = devices['iPad Mini'].viewport;

test.describe('Development Recipes', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/development');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Development Recipes/i);
  });

  test('has filter controls', async ({ page }) => {
    await page.goto('/development');
    await page.waitForLoadState('networkidle');

    const filmSelect = page.getByText(/film/i);
    await expect(filmSelect.first()).toBeVisible({ timeout: 10000 });
  });

  test('displays recipe results', async ({ page }) => {
    await page.goto('/development');
    await page.waitForLoadState('networkidle');

    const pagination = page.getByRole('button', {
      name: /next|previous|page/i,
    });
    await expect(pagination.first()).toBeVisible({ timeout: 15000 });
  });

  test('responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/development');
    await page.waitForLoadState('networkidle');

    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('responsive - tablet viewport', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/development');
    await page.waitForLoadState('networkidle');

    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});
