# E2E Example

This directory contains a working example of `playwright-team-domain-plugin` applied to a realistic multi-team registration and login flow.

## Scenario

A fictional SaaS application owned by five teams:

| Team | Ownership | Detection method |
|------|-----------|-----------------|
| **Team A — Registration** | Registration pages (`/register`, `/register/**`) | URL pattern + `RegisterPage` POM |
| **Team B — Credit Card** | Payment form embedded in registration | CSS selectors (`.credit-card-form`, `[data-team="payments"]`) |
| **Team C — Login** | Login page (`/login`) | URL pattern + `LoginPage` POM |
| **Team D — Dashboard Backend** | Dashboard API (`/api/dashboard/**`) | Network patterns |
| **Team E — Dashboard Frontend** | Dashboard page (`/dashboard`) | URL pattern + CSS selector (`[data-section="dashboard"]`) |

The plugin is configured once in [`playwright.config.ts`](../../playwright.config.ts) and requires no changes to individual test files.

## Structure

```
tests/e2e/
  registration.spec.ts   # Registration and payment step tests (Team A + Team B)
  login.spec.ts          # Login flow tests (Team C + Team E)
  dashboard.spec.ts      # Dashboard tests (Team D + Team E)
  pages/
    RegisterPage.ts      # Page Object for /register (Team A)
    LoginPage.ts         # Page Object for /login (Team C)
  fixtures/
    register.html
    register-payment.html
    login.html
    dashboard.html
  server.mjs             # Simple HTTP server serving the HTML fixtures
```

## Running the example

```bash
npm run test:e2e
```

## Intentional failures

Each spec includes one test that fails because the mock application does not implement the full feature. These failures are used to demonstrate the plugin's attribution behaviour:

| Failing test | Primary team | Why |
|---|---|---|
| `shows password strength indicator` | Team A | Fails on `/register` — no URL or selector signal from any other team |
| `shows accepted card brands on payment form` | Team B | Fails on `/register-payment` — two selector signals (`.credit-card-form` + `[data-team="payments"]`, combined weight 1.6) outweigh Team A's single URL signal (1.0) |
| `shows "Forgot password?" link` | Team C | Fails on `/login` without navigating elsewhere — URL signal and `LoginPage` POM both point to Team C |
| `dashboard API returns paginated results` | Team D | Four consecutive network calls to `/api/dashboard/**` (combined weight 2.0) outweigh Team E's URL + selector signals (max 1.8), especially as they are the most recent signals |
| `shows personalised greeting after sign-in` | Team E | Fails on `/dashboard` after sign-in — the `[data-section="dashboard"]` selector, detected after DOM load, is more recent than the older login signals from Team C |

## How attribution scoring works

Each signal has a **type weight** and a **recency weight** (`e^(−0.5 × seconds from last signal)`):

| Signal type | Weight |
|---|---|
| URL navigation | 1.0 |
| Page Object import | 0.9 |
| CSS selector found | 0.8 |
| Network request | 0.5 |

On failure, the team with the highest combined score is set as `team-domain-primary` in the test annotations and is reported in the console summary.

Attribution details (signals, scores, team rankings) are available as a JSON attachment in each test's trace.
