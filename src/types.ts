export interface TeamConfig {
  name: string;
  /** URL path glob patterns (e.g., '/register', '/dashboard/**') */
  urls?: string[];
  /** CSS selectors identifying page sections (e.g., '.credit-card-form', '[data-team="payments"]') */
  selectors?: string[];
  /** Network request patterns — domains, subdomains, or paths (e.g., 'api.dashboard.example.com/**', '/api/users/**') */
  networkPatterns?: string[];
  /** Page Object Model class names (e.g., 'LoginPage', 'DashboardPage') */
  pageObjects?: string[];
}

export interface TeamDomainPluginConfig {
  teams: TeamConfig[];
}

export interface TrackingSignal {
  type: 'url' | 'network' | 'selector' | 'page-object';
  value: string;
  timestamp: number;
}

export interface TeamMatch {
  team: TeamConfig;
  signals: TrackingSignal[];
  score: number;
}

export interface AttributionResult {
  /** Primary team most likely responsible (highest score). Only set on failure. */
  primaryTeam: TeamMatch | null;
  /** All teams involved in the test, ranked by score */
  allTeams: TeamMatch[];
  /** The most recent signal before test end */
  lastActiveSignal: TrackingSignal | null;
}
