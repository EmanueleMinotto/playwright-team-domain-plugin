import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test.describe('dashboard', () => {
  test('shows dashboard content', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Welcome back!')).toBeVisible();
  });

  test('loads data from the dashboard API', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByRole('button', { name: 'Load latest data' }).click();

    await expect(page.locator('#data-container')).not.toBeEmpty();
  });

  // Intentional failure — see tests/e2e/README.md ("Intentional failures").
  // The fixture doesn't implement this feature; used to demonstrate attribution to Team D.
  // Tagged @intentional-failure — see tests/e2e/registration.spec.ts for why this isn't test.fail().
  test('dashboard API returns paginated results @intentional-failure', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-section="dashboard"]');

    await Promise.all([
      page.evaluate(() => fetch('/api/dashboard/data').catch(() => {})),
      page.evaluate(() => fetch('/api/dashboard/summary').catch(() => {})),
      page.evaluate(() => fetch('/api/dashboard/metrics').catch(() => {})),
      page.evaluate(() => fetch('/api/dashboard/widgets').catch(() => {})),
    ]);

    await expect(page.locator('#data-container')).toContainText('"items"');
  });
});
