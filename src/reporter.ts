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

  onEnd(_result: FullResult): void {}
}

export default TeamDomainReporter;
