import { expect, test } from '@chromatic-com/playwright';
import { devices } from '@playwright/test';

// Device viewports for responsive testing
const MOBILE_VIEWPORT = devices['iPhone SE'].viewport;
const TABLET_VIEWPORT = devices['iPad Mini'].viewport;

// Note: Chromatic automatically captures screenshots at the end of each test.
// We don't use Playwright's toHaveScreenshot() because it creates platform-specific
// baselines (macOS vs Ubuntu font rendering differs). Chromatic handles visual
// regression on consistent cloud infrastructure.

test.describe('Homepage', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page).toHaveTitle(/Dorkroom/i);

    // Verify main heading exists
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Chromatic captures screenshot automatically at test end
  });

  test('has calculator section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify calculator section heading is visible
    const calculatorHeading = page.getByRole('heading', {
      name: /calculators/i,
      level: 2,
    });
    await expect(calculatorHeading).toBeVisible();

    // Verify Border Calculator link is visible
    const borderCalcLink = page.getByRole('link', {
      name: 'Border Calculator',
      exact: true,
    });
    await expect(borderCalcLink).toBeVisible();
  });

  test('can navigate to border calculator', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the Border Calculator link
    await page
      .getByRole('link', { name: 'Border Calculator', exact: true })
      .click();

    // Verify navigation succeeded
    await expect(page).toHaveURL('/border');
  });

  test('responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify page renders at mobile size
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Chromatic captures screenshot at this viewport
  });

  test('responsive - tablet viewport', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify page renders at tablet size
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Chromatic captures screenshot at this viewport
  });
});
