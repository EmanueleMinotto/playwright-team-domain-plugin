import { defineConfig } from '@playwright/test';
import type { TeamDomainOptions } from './src/index.js';

export default defineConfig<TeamDomainOptions>({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://localhost:3456',
    trace: 'on',
    teamDomainConfig: {
      teams: [
        { name: 'Team A - Registration', urls: ['/register', '/register/**'], pageObjects: ['RegisterPage'] },
        { name: 'Team B - Credit Card', selectors: ['.credit-card-form', '[data-team="payments"]'] },
        { name: 'Team C - Login', urls: ['/login'], pageObjects: ['LoginPage'] },
        { name: 'Team D - Dashboard Backend', networkPatterns: ['/api/dashboard/**'] },
        { name: 'Team E - Dashboard Frontend', urls: ['/dashboard'], selectors: ['[data-section="dashboard"]'] },
      ],
    },
  },
  webServer: {
    command: 'node tests/e2e/server.mjs',
    url: 'http://localhost:3456/register',
    reuseExistingServer: !process.env.CI,
  },
  reporter: [
    ['list'],
    ['./src/reporter.ts'],
  ],
});
