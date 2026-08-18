import { expect } from '@playwright/test';
import { test } from '../../src/index.js';
import { LoginPage } from './pages/LoginPage.js';

test.describe('login', () => {
  test('shows sign-in form', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('has a link to the registration page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: "Create one" }).click();

    await expect(page).toHaveURL(/register/);
  });

  // Intentional failure — see tests/e2e/README.md ("Intentional failures").
  // The fixture doesn't implement this feature; used to demonstrate attribution to Team C.
  // Tagged @intentional-failure — see tests/e2e/registration.spec.ts for why this isn't test.fail().
  test('shows "Forgot password?" link @intentional-failure', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });

  // Intentional failure — see tests/e2e/README.md ("Intentional failures").
  // The fixture doesn't implement this feature; used to demonstrate attribution to Team E.
  // Tagged @intentional-failure — see tests/e2e/registration.spec.ts for why this isn't test.fail().
  test('shows personalised greeting after sign-in @intentional-failure', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fill('user@example.com', 'Secret123!');
    await login.submit();

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText('Welcome back, user@example.com')).toBeVisible();
  });
});
