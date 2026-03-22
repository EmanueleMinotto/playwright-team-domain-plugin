import picomatch from 'picomatch';
import type { TeamConfig, TrackingSignal } from './types.js';

export function matchSignalToTeams(
  signal: TrackingSignal,
  teams: TeamConfig[],
): TeamConfig[] {
  return teams.filter((team) => {
    switch (signal.type) {
      case 'url':
        return team.urls?.some((pattern) => matchUrl(signal.value, pattern)) ?? false;
      case 'network':
        return team.networkPatterns?.some((pattern) => matchNetwork(signal.value, pattern)) ?? false;
      case 'selector':
        return team.selectors?.includes(signal.value) ?? false;
      case 'page-object':
        return team.pageObjects?.includes(signal.value) ?? false;
    }
  });
}

function matchUrl(url: string, pattern: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return picomatch.isMatch(pathname, pattern);
  } catch {
    return picomatch.isMatch(url, pattern);
  }
}

function matchNetwork(url: string, pattern: string): boolean {
  try {
    const parsed = new URL(url);
    const hostAndPath = parsed.host + parsed.pathname;
    return picomatch.isMatch(hostAndPath, pattern) || picomatch.isMatch(parsed.pathname, pattern);
  } catch {
    return picomatch.isMatch(url, pattern);
  }
}
