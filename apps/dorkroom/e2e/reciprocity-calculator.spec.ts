import { expect, test } from '@chromatic-com/playwright';
import { devices } from '@playwright/test';

// biome-ignore lint/style/noNonNullAssertion: Well-known Playwright device descriptors always have viewport
const MOBILE_VIEWPORT = devices['iPhone SE'].viewport!;
// biome-ignore lint/style/noNonNullAssertion: Well-known Playwright device descriptors always have viewport
const TABLET_VIEWPORT = devices['iPad Mini'].viewport!;

test.describe('Reciprocity Calculator', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/reciprocity');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Reciprocity.*Calculator/i);

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Reciprocity/i);
  });

  test('has film stock selector', async ({ page }) => {
    await page.goto('/reciprocity');
    await page.waitForLoadState('networkidle');

    const selectTrigger = page.getByRole('combobox');
    await expect(selectTrigger).toBeVisible();
  });

  test('has exposure input', async ({ page }) => {
    await page.goto('/reciprocity');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input');
    await expect(inputs.first()).toBeVisible();
  });

  test('responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/reciprocity');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('responsive - tablet viewport', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/reciprocity');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});
