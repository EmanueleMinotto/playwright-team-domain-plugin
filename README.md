# playwright-team-domain-plugin

Playwright plugin that automatically identifies teams involved in E2E test flows and attributes failures to the responsible team.

## Features

- **Automatic team detection** — no annotations needed in test code
- **URL tracking** — matches navigated URLs against team-owned paths
- **CSS selector tracking** — detects page sections owned by specific teams
- **Network tracking** — matches API calls to team-owned domains/paths
- **Page Object Model tracking** — detects POM imports in test files
- **Failure attribution** — pinpoints the most likely responsible team on failure
- **Reporter** — aggregated team involvement and failure summary

## Installation

```bash
npm install playwright-team-domain-plugin
```

## Usage

### 1. Import `test` from the plugin

Replace your Playwright `test` import with the one from this plugin:

```typescript
// Before
import { test, expect } from '@playwright/test';

// After
import { test } from 'playwright-team-domain-plugin';
import { expect } from '@playwright/test';
```

### 2. Configure teams in `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    teamDomainConfig: {
      teams: [
        {
          name: 'Team A - Registration',
          urls: ['/register', '/signup'],
        },
        {
          name: 'Team B - Credit Card',
          selectors: ['.credit-card-form', '[data-team="payments"]'],
        },
        {
          name: 'Team C - Login',
          urls: ['/login', '/auth'],
        },
        {
          name: 'Team D - Dashboard Backend',
          networkPatterns: ['api.dashboard.example.com/**', '/api/dashboard/**'],
        },
        {
          name: 'Team E - Dashboard Frontend',
          urls: ['/dashboard/**'],
          selectors: ['[data-section="dashboard"]'],
          pageObjects: ['DashboardPage'],
        },
      ],
    },
  },
  reporter: [
    ['html'],
    ['playwright-team-domain-plugin/reporter'],
  ],
});
```

### 3. Write tests as usual

No changes needed in your tests. The plugin automatically tracks:

```typescript
import { test } from 'playwright-team-domain-plugin';
import { expect } from '@playwright/test';

test('complete registration flow', async ({ page }) => {
  await page.goto('/register');
  await page.fill('#email', 'user@example.com');
  await page.fill('#password', 'secret123');
  // Credit card form appears on the page — Team B is detected via selectors
  await page.fill('.credit-card-form input[name="card"]', '4242424242424242');
  await page.click('button[type="submit"]');
  // Navigates to login — Team C is detected via URL
  await expect(page).toHaveURL('/login');
});
```

## Team Configuration

Each team can be identified by one or more criteria:

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Team name (displayed in reports) |
| `urls` | `string[]` | URL path glob patterns (e.g., `/dashboard/**`) |
| `selectors` | `string[]` | CSS selectors for page sections (e.g., `.credit-card-form`) |
| `networkPatterns` | `string[]` | Network request patterns — domains or paths (e.g., `api.example.com/**`) |
| `pageObjects` | `string[]` | Page Object Model class names (e.g., `LoginPage`) |

### Pattern Matching

- **URL patterns** use glob syntax via [picomatch](https://github.com/micromatch/picomatch): `/register`, `/dashboard/**`, `/api/v*/users`
- **Network patterns** match against `host + pathname` or `pathname` only: `api.dashboard.example.com/**` or `/api/dashboard/**`
- **Selectors** are exact CSS selectors checked via `document.querySelector()`
- **Page Objects** are matched by name against `import` statements in the test file

## Output

### Annotations

Every test gets `team-domain` annotations for each involved team, visible in Playwright's HTML reporter. On failure, a `team-domain-primary` annotation indicates the most likely responsible team.

### Attachments

A JSON attachment `team-domain-attribution` is added to each test with detailed attribution data including signals, scores, and team rankings.

### Reporter

Add `playwright-team-domain-plugin/reporter` to your reporters to collect team involvement and failure data across the test run. The data is available programmatically via the reporter's `teamStats` map and can be used to build custom dashboards or integrate with alerting systems.

## How Attribution Works

1. **Signal collection** — during test execution, the plugin records URLs visited, network requests made, CSS selectors found on page, and POM classes imported
2. **Team matching** — each signal is matched against team configuration
3. **Scoring** — on failure, teams are scored using recency-weighted signals (signals closer to the failure point count more) with type weights (URL > Page Object > Selector > Network)
4. **Primary team** — the highest-scored team is identified as the primary responsible team

## Example

A working example is available in [`tests/e2e/`](tests/e2e/README.md). It simulates a five-team registration-to-dashboard flow and includes one intentional failure per team to demonstrate attribution in action.

```bash
npm run test:e2e
```

## License

MIT
