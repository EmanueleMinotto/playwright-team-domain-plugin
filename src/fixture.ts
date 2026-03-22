import { test as base } from '@playwright/test';
import { SignalTracker } from './tracker.js';
import { computeAttribution } from './attribution.js';
import type { TeamDomainPluginConfig, AttributionResult } from './types.js';

export type TeamDomainOptions = {
  teamDomainConfig: TeamDomainPluginConfig;
};

export type TeamDomainFixtures = TeamDomainOptions & {
  _teamDomainTracker: SignalTracker;
  /** Public fixture for inspecting attribution state during a test. */
  teamDomain: {
    /** Returns the current attribution snapshot. Awaits pending selector detections. */
    getAttribution(): Promise<AttributionResult>;
  };
};

export const test = base.extend<TeamDomainFixtures>({
  teamDomainConfig: [{ teams: [] }, { option: true }],

  _teamDomainTracker: [async ({ page, teamDomainConfig }, use, testInfo) => {
    const tracker = new SignalTracker();

    tracker.extractPageObjectsFromFile(testInfo.file, teamDomainConfig);
    await tracker.attach(page, teamDomainConfig);

    await use(tracker);

    await tracker.flush();

    const signals = tracker.getSignals();
    const failed = testInfo.status !== testInfo.expectedStatus;
    const attribution = computeAttribution(signals, teamDomainConfig.teams, failed);

    annotateTest(testInfo, attribution, failed);
    await attachReport(testInfo, attribution);

    tracker.detach();
  }, { auto: true, box: true }],

  teamDomain: [async ({ _teamDomainTracker, teamDomainConfig }, use) => {
    await use({
      async getAttribution(): Promise<AttributionResult> {
        await _teamDomainTracker.flush();
        return computeAttribution(
          _teamDomainTracker.getSignals(),
          teamDomainConfig.teams,
          false,
        );
      },
    });
  }, { box: true }],
});

function annotateTest(
  testInfo: { annotations: Array<{ type: string; description?: string }> },
  attribution: AttributionResult,
  failed: boolean,
): void {
  for (const teamMatch of attribution.allTeams) {
    testInfo.annotations.push({
      type: 'team-domain',
      description: teamMatch.team.name,
    });
  }

  if (failed && attribution.primaryTeam) {
    testInfo.annotations.push({
      type: 'team-domain-primary',
      description: attribution.primaryTeam.team.name,
    });
  }
}

async function attachReport(
  testInfo: { attach(name: string, options: { body: string; contentType: string }): Promise<void> },
  attribution: AttributionResult,
): Promise<void> {
  if (attribution.allTeams.length === 0) return;

  await testInfo.attach('team-domain-attribution', {
    body: JSON.stringify(attribution, null, 2),
    contentType: 'application/json',
  });
}
