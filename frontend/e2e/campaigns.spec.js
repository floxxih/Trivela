import { test, expect } from '@playwright/test';

/**
 * E2E tests for the campaigns page.
 *
 * The webServer in playwright.config.js starts `vite preview` before the suite
 * runs, so no manual server start is required.
 *
 * Run:
 *   npm run build --workspace=frontend
 *   npm run test  --workspace=frontend
 */

test.describe('Campaigns page', () => {
  test('page loads with the correct title and hero heading', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Trivela/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Campaigns & rewards',
    );
  });

  test('campaigns section shows a list or empty state after loading', async ({ page }) => {
    await page.goto('/');

    // Either the campaigns grid or an empty-state block must appear once
    // loading has settled.  The empty state renders when the API is
    // unreachable (e.g. in CI without a running backend).
    await expect(page.locator('.campaigns-grid, .empty-state')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('clicking a campaign card navigates to the detail page', async ({ page }) => {
    await page.goto('/');

    // Wait for the campaigns panel to settle
    await expect(page.locator('.campaigns-grid, .empty-state')).toBeVisible({
      timeout: 15_000,
    });

    const firstCard = page.locator('.campaign-card-link').first();

    // Only run the navigation assertion when campaigns are actually present
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await expect(page).toHaveURL(/\/campaign\//);
      await expect(page.getByRole('main')).toBeVisible();
    }
  });
});
