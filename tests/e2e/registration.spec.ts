import { expect } from '@playwright/test';
import { test } from '../../src/index.js';
import { RegisterPage } from './pages/RegisterPage.js';

test.describe('registration', () => {
  test('shows account creation form', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue to payment' })).toBeVisible();
  });

  test('proceeds to payment step after filling account details', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.fill('user@example.com', 'Secret123!');
    await register.submit();

    await expect(page).toHaveURL(/register-payment/);
    await expect(page.getByRole('heading', { name: 'Payment details' })).toBeVisible();
  });

  test('shows credit card form on payment step', async ({ page }) => {
    await page.goto('/register-payment');

    await expect(page.getByRole('textbox', { name: 'Card number' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Expiry' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'CVV' })).toBeVisible();
  });

  test('shows accepted card brands on payment form', async ({ page }) => {
    await page.goto('/register-payment');

    await expect(page.locator('.accepted-cards')).toBeVisible();
  });

  test('shows password strength indicator', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.fill('user@example.com', 'Test');

    await expect(page.locator('.password-strength')).toBeVisible();
  });
});
