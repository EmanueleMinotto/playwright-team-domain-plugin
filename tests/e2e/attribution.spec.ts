import { expect } from '@playwright/test';
import { test } from '../../src/index.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { LoginPage } from './pages/LoginPage.js';

/**
 * Integration coverage for the plugin's own attribution wiring — as opposed to
 * the other specs in this directory, which exercise the demo app and only
 * demonstrate attribution visually (via the console reporter and the trace
 * attachment). These tests assert on `teamDomain.getAttribution()` directly,
 * verifying that SignalTracker + computeAttribution are wired correctly
 * against a real page, real navigation, real selectors, and real network
 * calls — not the fakes used in the unit suite.
 */
test.describe('attribution wiring', () => {
  test('attributes a URL navigation and POM import to the owning team', async ({ page, teamDomain }) => {
    const register = new RegisterPage(page);
    await register.goto();

    const attribution = await teamDomain.getAttribution();

    const teamNames = attribution.allTeams.map((t) => t.team.name);
    expect(teamNames).toContain('Team A - Registration');
    expect(
      attribution.allTeams
        .find((t) => t.team.name === 'Team A - Registration')!
        .signals.map((s) => s.type),
    ).toEqual(expect.arrayContaining(['url', 'page-object']));
  });

  test('attributes the credit card selector to Team B', async ({ page, teamDomain }) => {
    await page.goto('/register-payment');

    const attribution = await teamDomain.getAttribution();

    const teamB = attribution.allTeams.find((t) => t.team.name === 'Team B - Credit Card');
    expect(teamB).toBeDefined();
    expect(teamB!.signals.some((s) => s.type === 'selector')).toBe(true);
  });

  test('attributes dashboard API calls to the backend team via network signals', async ({ page, teamDomain }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Load latest data' }).click();
    await expect(page.locator('#data-container')).not.toBeEmpty();

    const attribution = await teamDomain.getAttribution();

    const teamD = attribution.allTeams.find((t) => t.team.name === 'Team D - Dashboard Backend');
    expect(teamD).toBeDefined();
    expect(teamD!.signals.some((s) => s.type === 'network' && s.value.includes('/api/dashboard/'))).toBe(true);
  });

  test('accumulates signals from multiple teams across a multi-page flow', async ({ page, teamDomain }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.fill('user@example.com', 'Secret123!');
    await register.submit();
    await expect(page).toHaveURL(/register-payment/);

    const attribution = await teamDomain.getAttribution();

    const teamNames = attribution.allTeams.map((t) => t.team.name);
    expect(teamNames).toEqual(expect.arrayContaining(['Team A - Registration', 'Team B - Credit Card']));
  });

  test('sets the last active signal to the most recently detected one', async ({ page, teamDomain }) => {
    const login = new LoginPage(page);
    await login.goto();

    const attribution = await teamDomain.getAttribution();

    expect(attribution.lastActiveSignal).not.toBeNull();
    expect(attribution.lastActiveSignal!.type).toBe('url');
  });

  test('getAttribution never sets primaryTeam mid-test, even with signals present', async ({ page, teamDomain }) => {
    await page.goto('/dashboard');

    const attribution = await teamDomain.getAttribution();

    // primaryTeam is only computed at teardown, once the final pass/fail
    // status is known — mid-test inspection must never guess at it.
    expect(attribution.primaryTeam).toBeNull();
  });
});
