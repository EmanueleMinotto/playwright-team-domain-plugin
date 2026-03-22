import { computeAttribution } from '../../src/attribution.js';
import type { TeamConfig, TrackingSignal } from '../../src/types.js';

const teams: TeamConfig[] = [
  { name: 'Team A - Registration', urls: ['/register'] },
  { name: 'Team B - Credit Card', selectors: ['.credit-card-form'] },
  { name: 'Team C - Login', urls: ['/login'] },
  { name: 'Team D - Dashboard Backend', networkPatterns: ['/api/dashboard/**'] },
];

describe('computeAttribution', () => {
  it('returns all involved teams on success', () => {
    const now = Date.now();
    const signals: TrackingSignal[] = [
      { type: 'url', value: 'https://example.com/register', timestamp: now - 5000 },
      { type: 'selector', value: '.credit-card-form', timestamp: now - 3000 },
      { type: 'url', value: 'https://example.com/login', timestamp: now },
    ];

    const result = computeAttribution(signals, teams, false);

    expect(result.primaryTeam).toBeNull();
    expect(result.allTeams.map((t) => t.team.name)).toEqual(
      expect.arrayContaining(['Team A - Registration', 'Team B - Credit Card', 'Team C - Login']),
    );
    expect(result.allTeams).toHaveLength(3);
  });

  it('sets primaryTeam on failure with highest scored team', () => {
    const now = Date.now();
    const signals: TrackingSignal[] = [
      { type: 'url', value: 'https://example.com/register', timestamp: now - 10000 },
      { type: 'url', value: 'https://example.com/login', timestamp: now },
    ];

    const result = computeAttribution(signals, teams, true);

    expect(result.primaryTeam).not.toBeNull();
    expect(result.primaryTeam!.team.name).toBe('Team C - Login');
  });

  it('ranks teams by recency-weighted score', () => {
    const now = Date.now();
    const signals: TrackingSignal[] = [
      { type: 'url', value: 'https://example.com/register', timestamp: now - 30000 },
      { type: 'url', value: 'https://example.com/login', timestamp: now },
    ];

    const result = computeAttribution(signals, teams, true);

    const teamNames = result.allTeams.map((t) => t.team.name);
    expect(teamNames[0]).toBe('Team C - Login');
    expect(teamNames[1]).toBe('Team A - Registration');
  });

  it('weights signal types correctly', () => {
    const now = Date.now();
    const signals: TrackingSignal[] = [
      { type: 'url', value: 'https://example.com/register', timestamp: now },
      { type: 'network', value: 'https://example.com/api/dashboard/data', timestamp: now },
    ];

    const result = computeAttribution(signals, teams, true);

    const teamA = result.allTeams.find((t) => t.team.name === 'Team A - Registration');
    const teamD = result.allTeams.find((t) => t.team.name === 'Team D - Dashboard Backend');
    expect(teamA!.score).toBeGreaterThan(teamD!.score);
  });

  it('returns empty results when no signals match', () => {
    const signals: TrackingSignal[] = [
      { type: 'url', value: 'https://example.com/about', timestamp: Date.now() },
    ];

    const result = computeAttribution(signals, teams, true);

    expect(result.primaryTeam).toBeNull();
    expect(result.allTeams).toHaveLength(0);
  });

  it('returns empty results for no signals', () => {
    const result = computeAttribution([], teams, false);

    expect(result.primaryTeam).toBeNull();
    expect(result.allTeams).toHaveLength(0);
    expect(result.lastActiveSignal).toBeNull();
  });

  it('sets lastActiveSignal to the most recent signal', () => {
    const now = Date.now();
    const signals: TrackingSignal[] = [
      { type: 'url', value: 'https://example.com/register', timestamp: now - 5000 },
      { type: 'selector', value: '.credit-card-form', timestamp: now },
      { type: 'url', value: 'https://example.com/login', timestamp: now - 1000 },
    ];

    const result = computeAttribution(signals, teams, false);

    expect(result.lastActiveSignal).toEqual(
      expect.objectContaining({ type: 'selector', value: '.credit-card-form' }),
    );
  });

  it('accumulates score for multiple signals from same team', () => {
    const now = Date.now();
    const signals: TrackingSignal[] = [
      { type: 'network', value: 'https://example.com/api/dashboard/data', timestamp: now },
      { type: 'network', value: 'https://example.com/api/dashboard/widgets', timestamp: now },
      { type: 'url', value: 'https://example.com/register', timestamp: now },
    ];

    const result = computeAttribution(signals, teams, true);

    const teamD = result.allTeams.find((t) => t.team.name === 'Team D - Dashboard Backend');
    const teamA = result.allTeams.find((t) => t.team.name === 'Team A - Registration');
    expect(teamD!.score).toBe(2 * 0.5);
    expect(teamA!.score).toBe(1.0);
  });
});
