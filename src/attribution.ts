import { matchSignalToTeams } from './matcher.js';
import type { TeamConfig, TrackingSignal, TeamMatch, AttributionResult } from './types.js';

const TYPE_WEIGHTS: Record<TrackingSignal['type'], number> = {
  url: 1.0,
  'page-object': 0.9,
  selector: 0.8,
  network: 0.5,
};

const DECAY_LAMBDA = 0.5;

export function computeAttribution(
  signals: TrackingSignal[],
  teams: TeamConfig[],
  failed: boolean,
): AttributionResult {
  const teamSignals = new Map<string, TrackingSignal[]>();

  for (const signal of signals) {
    const matched = matchSignalToTeams(signal, teams);
    for (const team of matched) {
      const existing = teamSignals.get(team.name) ?? [];
      existing.push(signal);
      teamSignals.set(team.name, existing);
    }
  }

  const endTime = signals.length > 0 ? Math.max(...signals.map((s) => s.timestamp)) : Date.now();

  const allTeams: TeamMatch[] = [];
  for (const team of teams) {
    const matched = teamSignals.get(team.name);
    if (!matched || matched.length === 0) continue;

    const score = computeScore(matched, endTime);
    allTeams.push({ team, signals: matched, score });
  }

  allTeams.sort((a, b) => b.score - a.score);

  const lastActiveSignal = signals.length > 0
    ? signals.reduce((latest, s) => (s.timestamp > latest.timestamp ? s : latest))
    : null;

  return {
    primaryTeam: failed && allTeams.length > 0 ? allTeams[0] : null,
    allTeams,
    lastActiveSignal,
  };
}

function computeScore(signals: TrackingSignal[], endTime: number): number {
  let score = 0;
  for (const signal of signals) {
    const timeDelta = (endTime - signal.timestamp) / 1000;
    const recencyWeight = Math.exp(-DECAY_LAMBDA * timeDelta);
    const typeWeight = TYPE_WEIGHTS[signal.type];
    score += recencyWeight * typeWeight;
  }
  return score;
}
