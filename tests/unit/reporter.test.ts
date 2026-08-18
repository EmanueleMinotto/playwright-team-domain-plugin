import { jest } from '@jest/globals';
import TeamDomainReporter from '../../src/reporter.js';
import type { TestCase, TestResult, FullResult } from '@playwright/test/reporter';

function fakeResult(annotations: Array<{ type: string; description?: string }>): TestResult {
  return { annotations } as unknown as TestResult;
}

const fakeTest = {} as TestCase;
const fakeFullResult = {} as FullResult;

describe('TeamDomainReporter', () => {
  it('counts a team as involved for each team-domain annotation', () => {
    const reporter = new TeamDomainReporter();

    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'Team A - Registration' },
    ]));
    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'Team A - Registration' },
    ]));

    const stats = reporter.getTeamStats();
    expect(stats).toEqual([['Team A - Registration', { involved: 2, failures: 0 }]]);
  });

  it('counts a failure only for the team-domain-primary annotation', () => {
    const reporter = new TeamDomainReporter();

    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'Team A - Registration' },
      { type: 'team-domain', description: 'Team B - Credit Card' },
      { type: 'team-domain-primary', description: 'Team B - Credit Card' },
    ]));

    const stats = new Map(reporter.getTeamStats());
    expect(stats.get('Team A - Registration')).toEqual({ involved: 1, failures: 0 });
    expect(stats.get('Team B - Credit Card')).toEqual({ involved: 1, failures: 1 });
  });

  it('accumulates stats across multiple tests for the same team', () => {
    const reporter = new TeamDomainReporter();

    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'Team C - Login' },
      { type: 'team-domain-primary', description: 'Team C - Login' },
    ]));
    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'Team C - Login' },
    ]));

    const stats = new Map(reporter.getTeamStats());
    expect(stats.get('Team C - Login')).toEqual({ involved: 2, failures: 1 });
  });

  it('ignores tests with no team-domain annotations', () => {
    const reporter = new TeamDomainReporter();

    reporter.onTestEnd(fakeTest, fakeResult([]));

    expect(reporter.getTeamStats()).toEqual([]);
  });

  it('handles a missing annotations array defensively', () => {
    const reporter = new TeamDomainReporter();

    reporter.onTestEnd(fakeTest, { annotations: undefined } as unknown as TestResult);

    expect(reporter.getTeamStats()).toEqual([]);
  });

  it('sorts teams by failures then involvement, both descending', () => {
    const reporter = new TeamDomainReporter();

    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'Low involvement, no failures' },
    ]));
    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'High involvement, no failures' },
    ]));
    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'High involvement, no failures' },
    ]));
    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'One failure' },
      { type: 'team-domain-primary', description: 'One failure' },
    ]));

    const order = reporter.getTeamStats().map(([name]) => name);
    expect(order).toEqual(['One failure', 'High involvement, no failures', 'Low involvement, no failures']);
  });

  it('prints a summary line per team on end, and nothing when no team was ever involved', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const emptyReporter = new TeamDomainReporter();
    emptyReporter.onEnd(fakeFullResult);
    expect(logSpy).not.toHaveBeenCalled();

    const reporter = new TeamDomainReporter();
    reporter.onTestEnd(fakeTest, fakeResult([
      { type: 'team-domain', description: 'Team A - Registration' },
      { type: 'team-domain-primary', description: 'Team A - Registration' },
    ]));
    reporter.onEnd(fakeFullResult);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Team domain summary'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Team A - Registration'));

    logSpy.mockRestore();
  });
});
