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

  test('dashboard API returns paginated results', async ({ page }) => {
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
