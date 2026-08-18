import { jest } from '@jest/globals';
import { annotateTest, attachReport } from '../../src/fixture.js';
import type { AttributionResult, TeamConfig, TeamMatch } from '../../src/types.js';

const teamA: TeamConfig = { name: 'Team A - Registration', urls: ['/register'] };
const teamB: TeamConfig = { name: 'Team B - Credit Card', selectors: ['.credit-card-form'] };

function teamMatch(team: TeamConfig, score = 1): TeamMatch {
  return { team, signals: [], score };
}

describe('annotateTest', () => {
  it('adds a team-domain annotation for every involved team', () => {
    const attribution: AttributionResult = {
      primaryTeam: null,
      allTeams: [teamMatch(teamA), teamMatch(teamB)],
      lastActiveSignal: null,
    };
    const testInfo = { annotations: [] as Array<{ type: string; description?: string }> };

    annotateTest(testInfo, attribution, false);

    expect(testInfo.annotations).toEqual([
      { type: 'team-domain', description: 'Team A - Registration' },
      { type: 'team-domain', description: 'Team B - Credit Card' },
    ]);
  });

  it('adds a team-domain-primary annotation only when the test failed and a primary team exists', () => {
    const attribution: AttributionResult = {
      primaryTeam: teamMatch(teamA),
      allTeams: [teamMatch(teamA)],
      lastActiveSignal: null,
    };
    const testInfo = { annotations: [] as Array<{ type: string; description?: string }> };

    annotateTest(testInfo, attribution, true);

    expect(testInfo.annotations).toContainEqual({
      type: 'team-domain-primary',
      description: 'Team A - Registration',
    });
  });

  it('does not add a primary annotation on success, even if a primary team is set', () => {
    const attribution: AttributionResult = {
      primaryTeam: teamMatch(teamA),
      allTeams: [teamMatch(teamA)],
      lastActiveSignal: null,
    };
    const testInfo = { annotations: [] as Array<{ type: string; description?: string }> };

    annotateTest(testInfo, attribution, false);

    expect(testInfo.annotations.some((a) => a.type === 'team-domain-primary')).toBe(false);
  });

  it('does not add a primary annotation on failure when no team could be attributed', () => {
    const attribution: AttributionResult = {
      primaryTeam: null,
      allTeams: [],
      lastActiveSignal: null,
    };
    const testInfo = { annotations: [] as Array<{ type: string; description?: string }> };

    annotateTest(testInfo, attribution, true);

    expect(testInfo.annotations).toHaveLength(0);
  });
});

describe('attachReport', () => {
  it('attaches a JSON report when at least one team is involved', async () => {
    const attribution: AttributionResult = {
      primaryTeam: null,
      allTeams: [teamMatch(teamA)],
      lastActiveSignal: null,
    };
    const attach = jest
      .fn<(name: string, options: { body: string; contentType: string }) => Promise<void>>()
      .mockResolvedValue(undefined);

    await attachReport({ attach }, attribution);

    expect(attach).toHaveBeenCalledWith('team-domain-attribution', {
      body: JSON.stringify(attribution, null, 2),
      contentType: 'application/json',
    });
  });

  it('skips the attachment when no team is involved', async () => {
    const attribution: AttributionResult = {
      primaryTeam: null,
      allTeams: [],
      lastActiveSignal: null,
    };
    const attach = jest
      .fn<(name: string, options: { body: string; contentType: string }) => Promise<void>>()
      .mockResolvedValue(undefined);

    await attachReport({ attach }, attribution);

    expect(attach).not.toHaveBeenCalled();
  });
});
