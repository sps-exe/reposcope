/**
 * Reposcope Score — Reposcope's own health & activity metric for a repository.
 *
 * A 0–100 composite score computed entirely from GitHub's public API (no
 * database required), weighted across five dimensions:
 *
 *   Popularity   (30%)  stars + forks + watchers (log-scaled)
 *   Velocity     (30%)  commit activity over the last year (recency-weighted)
 *   Maintenance  (20%)  how recently the repository was pushed to
 *   Community    (10%)  number of unique contributors (log-scaled)
 *   Longevity    (10%)  age of the repository
 *
 * Pure & edge-safe (no Node APIs), so it can be shared between the JSON
 * `/api/score` route and the edge-rendered badge API.
 */

export interface ScoreInput {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  contributors: number;
  createdAt: string;
  pushedAt: string;
  /** Weekly commit totals, oldest first, last 52 weeks (may be shorter/empty). */
  weeklyCommits: number[];
  /** Whether `weeklyCommits` came from GitHub's commit-activity stats API. */
  hasCommitActivity: boolean;
}

export interface ScoreDimension {
  /** 0–100 */
  score: number;
  /** Contribution to the total, out of 100 */
  weight: number;
}

export interface ReposcopeScore {
  score: number;
  grade: string;
  dimensions: {
    popularity: ScoreDimension;
    velocity: ScoreDimension;
    maintenance: ScoreDimension;
    community: ScoreDimension;
    longevity: ScoreDimension;
  };
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const logScale = (value: number, saturation: number): number =>
  clamp01(Math.log10(value + 1) / saturation);

function daysSince(isoDate: string): number {
  const time = Date.parse(isoDate);
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return (Date.now() - time) / 86_400_000;
}

function ageInYears(isoDate: string): number {
  const time = Date.parse(isoDate);
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, (Date.now() - time) / (365.25 * 86_400_000));
}

export function gradeFor(score: number): string {
  if (score >= 85) return 'Exceptional';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Healthy';
  if (score >= 40) return 'Developing';
  return 'Nascent';
}

export function computeReposcopeScore(input: ScoreInput): ReposcopeScore {
  // Popularity (30%) — log-scaled so a 100-star repo isn't drowned out.
  const stars = logScale(input.stars, 4); // 10k stars → 1.0
  const forks = logScale(input.forks, 3.5); // ~3.2k forks → 1.0
  const watchers = logScale(input.watchers, 4);
  const popularity = 0.5 * stars + 0.3 * forks + 0.2 * watchers;

  // Velocity (30%) — commit activity with a recency half-life of ~6 months.
  let velocity: number;
  if (input.hasCommitActivity && input.weeklyCommits.length > 0) {
    const n = input.weeklyCommits.length;
    let effective = 0;
    let decaySum = 0;
    for (let i = 0; i < n; i++) {
      const weeksAgo = n - 1 - i;
      const decay = Math.exp(-weeksAgo / 26);
      effective += decay * input.weeklyCommits[i];
      decaySum += decay;
    }
    const avgPerWeek = effective / (decaySum || 1);
    velocity = clamp01(avgPerWeek / 250);
  } else {
    // No commit stats available — fall back to how recently the repo moved.
    velocity = clamp01(1 - daysSince(input.pushedAt) / 365);
  }

  // Maintenance (20%) — recent pushes mean the project is alive.
  const maintenance = clamp01(1 - daysSince(input.pushedAt) / 180);

  // Community (10%) — contributors are the signal of a real community.
  const community = logScale(input.contributors, 3); // 1k contributors → 1.0

  // Longevity (10%) — a project that has survived 5+ years has momentum.
  const longevity = clamp01(ageInYears(input.createdAt) / 5);

  const score = Math.round(
    popularity * 30 + velocity * 30 + maintenance * 20 + community * 10 + longevity * 10,
  );

  return {
    score,
    grade: gradeFor(score),
    dimensions: {
      popularity: { score: Math.round(popularity * 100), weight: 30 },
      velocity: { score: Math.round(velocity * 100), weight: 30 },
      maintenance: { score: Math.round(maintenance * 100), weight: 20 },
      community: { score: Math.round(community * 100), weight: 10 },
      longevity: { score: Math.round(longevity * 100), weight: 10 },
    },
  };
}
