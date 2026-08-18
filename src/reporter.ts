import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

interface TeamStats {
  involved: number;
  failures: number;
}

class TeamDomainReporter implements Reporter {
  private teamStats = new Map<string, TeamStats>();

  onTestEnd(test: TestCase, result: TestResult): void {
    const teamAnnotations = (result.annotations ?? []).filter((a) => a.type === 'team-domain');
    const primaryAnnotation = (result.annotations ?? []).find((a) => a.type === 'team-domain-primary');

    for (const annotation of teamAnnotations) {
      const name = annotation.description ?? 'Unknown';
      const stats = this.teamStats.get(name) ?? { involved: 0, failures: 0 };
      stats.involved++;
      this.teamStats.set(name, stats);
    }

    if (primaryAnnotation) {
      const name = primaryAnnotation.description ?? 'Unknown';
      const stats = this.teamStats.get(name) ?? { involved: 0, failures: 0 };
      stats.failures++;
      this.teamStats.set(name, stats);
    }
  }

  onEnd(_result: FullResult): void {
    const stats = this.getTeamStats();
    if (stats.length === 0) return;

    console.log('\nTeam domain summary:');
    for (const [name, teamStats] of stats) {
      console.log(`  ${name}: involved in ${teamStats.involved}, responsible for ${teamStats.failures} failure(s)`);
    }
  }

  /** Snapshot of aggregated per-team stats, sorted by failures then involvement, both descending. */
  getTeamStats(): Array<[string, TeamStats]> {
    return [...this.teamStats.entries()].sort(
      ([, a], [, b]) => b.failures - a.failures || b.involved - a.involved,
    );
  }
}

export default TeamDomainReporter;
