import { matchSignalToTeams } from '../../src/matcher.js';
import type { TeamConfig, TrackingSignal } from '../../src/types.js';

const teams: TeamConfig[] = [
  { name: 'Team A - Registration', urls: ['/register', '/signup'] },
  { name: 'Team B - Credit Card', selectors: ['.credit-card-form', '[data-team="payments"]'] },
  { name: 'Team C - Login', urls: ['/login'] },
  { name: 'Team D - Dashboard Backend', networkPatterns: ['api.dashboard.example.com/**', '/api/dashboard/**'] },
  { name: 'Team E - Dashboard Frontend', urls: ['/dashboard/**'], selectors: ['[data-section="dashboard"]'] },
];

describe('matchSignalToTeams', () => {
  describe('url signals', () => {
    it('matches exact URL path', () => {
      const signal: TrackingSignal = { type: 'url', value: 'https://example.com/register', timestamp: 0 };
      const result = matchSignalToTeams(signal, teams);
      expect(result.map((t) => t.name)).toEqual(['Team A - Registration']);
    });

    it('matches glob URL pattern', () => {
      const signal: TrackingSignal = { type: 'url', value: 'https://example.com/dashboard/settings', timestamp: 0 };
      const result = matchSignalToTeams(signal, teams);
      expect(result.map((t) => t.name)).toEqual(['Team E - Dashboard Frontend']);
    });

    it('returns empty array for unmatched URL', () => {
      const signal: TrackingSignal = { type: 'url', value: 'https://example.com/about', timestamp: 0 };
      const result = matchSignalToTeams(signal, teams);
      expect(result).toEqual([]);
    });
  });

  describe('network signals', () => {
    it('matches domain pattern', () => {
      const signal: TrackingSignal = { type: 'network', value: 'https://api.dashboard.example.com/v1/data', timestamp: 0 };
      const result = matchSignalToTeams(signal, teams);
      expect(result.map((t) => t.name)).toEqual(['Team D - Dashboard Backend']);
    });

    it('matches path-only pattern', () => {
      const signal: TrackingSignal = { type: 'network', value: 'https://example.com/api/dashboard/widgets', timestamp: 0 };
      const result = matchSignalToTeams(signal, teams);
      expect(result.map((t) => t.name)).toEqual(['Team D - Dashboard Backend']);
    });

    it('returns empty array for unmatched network request', () => {
      const signal: TrackingSignal = { type: 'network', value: 'https://cdn.example.com/image.png', timestamp: 0 };
      const result = matchSignalToTeams(signal, teams);
      expect(result).toEqual([]);
    });
  });

  describe('selector signals', () => {
    it('matches exact selector', () => {
      const signal: TrackingSignal = { type: 'selector', value: '.credit-card-form', timestamp: 0 };
      const result = matchSignalToTeams(signal, teams);
      expect(result.map((t) => t.name)).toEqual(['Team B - Credit Card']);
    });

    it('matches data attribute selector', () => {
      const signal: TrackingSignal = { type: 'selector', value: '[data-section="dashboard"]', timestamp: 0 };
      const result = matchSignalToTeams(signal, teams);
      expect(result.map((t) => t.name)).toEqual(['Team E - Dashboard Frontend']);
    });
  });

  describe('page-object signals', () => {
    it('matches POM class name', () => {
      const teamsWithPom: TeamConfig[] = [
        { name: 'Team C - Login', urls: ['/login'], pageObjects: ['LoginPage'] },
      ];
      const signal: TrackingSignal = { type: 'page-object', value: 'LoginPage', timestamp: 0 };
      const result = matchSignalToTeams(signal, teamsWithPom);
      expect(result.map((t) => t.name)).toEqual(['Team C - Login']);
    });
  });

  describe('multiple team matches', () => {
    it('can match multiple teams for overlapping selectors', () => {
      const overlappingTeams: TeamConfig[] = [
        { name: 'Team X', selectors: ['.shared-component'] },
        { name: 'Team Y', selectors: ['.shared-component'] },
      ];
      const signal: TrackingSignal = { type: 'selector', value: '.shared-component', timestamp: 0 };
      const result = matchSignalToTeams(signal, overlappingTeams);
      expect(result).toHaveLength(2);
    });
  });
});
