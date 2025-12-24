import { expect, test } from '@chromatic-com/playwright';

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

  test('homepage calculator grid', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find the calculator section and screenshot it
    const calculatorSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: /calculators/i }),
    });

    if (await calculatorSection.isVisible()) {
      await expect(calculatorSection).toHaveScreenshot('calculator-grid.png');
    }
  });

  test('homepage stats section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find stats/metrics section
    const statsSection = page.locator('[data-testid="stats-section"]');

    if (await statsSection.isVisible()) {
      await expect(statsSection).toHaveScreenshot('stats-section.png');
    }
  });

  test('homepage responsive - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
    });
  });

  test('homepage responsive - tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
    });
  });
});
