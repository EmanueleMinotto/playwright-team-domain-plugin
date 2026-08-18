# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `tests/e2e/attribution.spec.ts` — integration tests exercising the `teamDomain.getAttribution()`
  fixture against the real demo server, verifying URL, selector, network, and page-object
  signals are attributed to the correct team end to end.
- `tests/unit/fixture.test.ts` — unit tests for `annotateTest` and `attachReport`, now exported
  from `src/fixture.ts`.
- `tests/unit/reporter.test.ts` — unit tests for `TeamDomainReporter`, including its new
  `getTeamStats()` method.
- `test:e2e:ci` npm script (`playwright test --grep-invert @intentional-failure`) — runs the e2e
  suite excluding the demo's intentionally-failing tests, for use as a CI gate.
- CI (`ci.yml`) and publish (`publish.yml`) workflows now install Playwright's Chromium browser
  and run `npm run test:e2e:ci` — the e2e suite was previously never executed by either workflow.

### Fixed
- `TeamDomainReporter.onEnd()` was a no-op: per-team stats were aggregated on every `onTestEnd`
  but never printed, despite the README documenting a console summary. It now logs one line per
  involved team, sorted by failures then involvement.

### Changed
- `annotateTest` and `attachReport` in `src/fixture.ts` are now exported (previously
  module-private), making them directly unit-testable.
- The five intentionally-failing tests in `tests/e2e/*.spec.ts` (used to demonstrate the
  plugin's failure-attribution behaviour) are now tagged `@intentional-failure` in their titles,
  so `test:e2e:ci` can exclude them while `test:e2e` still runs the full demo locally.
