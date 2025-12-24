import { devices } from '@playwright/test';
import { expect, test } from '@chromatic-com/playwright';

// Device viewports for responsive testing
const MOBILE_VIEWPORT = devices['iPhone SE'].viewport;
const TABLET_VIEWPORT = devices['iPad Mini'].viewport;

test.describe('Homepage Visual Regression', () => {
  test('homepage renders correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page).toHaveTitle(/Dorkroom/i);

    // Verify main heading exists
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Take a full-page screenshot for Chromatic visual regression
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
    });
  });

  test('homepage has calculator section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify calculator section heading is visible
    const calculatorHeading = page.getByRole('heading', {
      name: /calculators/i,
      level: 2,
    });
    await expect(calculatorHeading).toBeVisible();

    // Verify at least one calculator link exists
    const borderCalcLink = page.getByRole('link', { name: /border/i }).first();
    await expect(borderCalcLink).toBeVisible();
  });

  test('homepage responsive - mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
    });
  });

  test('homepage responsive - tablet', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
    });
  });
});
