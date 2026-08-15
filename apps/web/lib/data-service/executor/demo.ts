import { DateTime } from 'luxon';
import type { EndpointConfig } from '../config';
import { prepareQueryContext } from './utils';

/**
 * Demo mode — synthetic data when no `DATABASE_URL` is configured.
 *
 * The analytics backend is a TiDB Serverless cluster (cloud-only driver), so a
 * fresh clone has no data. Instead of showing an empty/erroring site, demo
 * mode serves plausible synthetic rows for the most visible queries — the
 * homepage hero, the live event ticker, and the repo overview + stars history
 * — so the whole core experience renders with zero backend.
 *
 * Set `DATABASE_URL` to a real TiDB cluster to switch to live data.
 */

export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL?.trim();
}

const DEMO_SQL = '-- demo mode: synthetic data (set DATABASE_URL for live queries)';

// --- Deterministic helpers --------------------------------------------------

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/** Normalize a possibly-array param into a scalar. */
function scalar(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}

// --- Data generators --------------------------------------------------------

const DEMO_REPOS: [string, string][] = [
  ['facebook', 'react'],
  ['vercel', 'next.js'],
  ['rust-lang', 'rust'],
  ['sveltejs', 'svelte'],
  ['tauri-apps', 'tauri'],
  ['microsoft', 'typescript'],
  ['golang', 'go'],
  ['denoland', 'deno'],
  ['n8n-io', 'n8n'],
  ['supabase', 'supabase'],
  ['langgenius', 'dify'],
  ['apache', 'arrow'],
];

const DEMO_ACTORS = [
  'octocat', 'devpulse', 'code_runner', 'night_owl', 'git_wizard', 'byte_bandit',
  'type_techie', 'merge_queen', 'pull_request_pete', 'commit_carl', 'star_stella',
  'fork_frank', 'issue_ian', 'release_rita', 'review_robin', 'ci_cindy',
];

const DEMO_TYPES: [string, string][] = [
  ['WatchEvent', 'started'],
  ['ForkEvent', ''],
  ['IssuesEvent', 'opened'],
  ['IssuesEvent', 'closed'],
  ['PullRequestEvent', 'opened'],
  ['PullRequestEvent', 'closed'],
  ['PushEvent', ''],
  ['ReleaseEvent', 'published'],
  ['PullRequestReviewCommentEvent', 'created'],
  ['IssueCommentEvent', 'created'],
  ['CreateEvent', 'created'],
];

interface DemoRow {
  [key: string]: unknown;
}

function demoEventsList(): DemoRow[] {
  const now = Date.now();
  const rows: DemoRow[] = [];
  const count = 20;
  for (let i = 0; i < count; i++) {
    const [repoOwner, repoName] = DEMO_REPOS[i % DEMO_REPOS.length];
    const [type, action] = DEMO_TYPES[i % DEMO_TYPES.length];
    const actorLogin = DEMO_ACTORS[(i * 7 + 3) % DEMO_ACTORS.length];
    const isPr = type === 'PullRequestEvent';
    const isIssue = type === 'IssuesEvent';
    rows.push({
      id: 2_200_000_000_000 + i,
      type,
      action,
      actor_id: 10_000_000 + i,
      actor_login: actorLogin,
      repo_id: 40_000_000 + i,
      repo_name: `${repoOwner}/${repoName}`,
      number: isPr || isIssue ? ((i * 137) % 4000) + 1 : 0,
      pr_merged: isPr && action === 'closed' && i % 2 === 0 ? 1 : 0,
      created_at: DateTime.fromMillis(now - i * 15000).toISO(),
    });
  }
  return rows;
}

function demoEventsTotal(): DemoRow[] {
  const now = DateTime.now();
  const minute = Math.floor(now.toMillis() / 60000);
  const cnt = 2_200_000 + (minute % 97) * 7_000 + (minute % 13) * 19_000;
  return [{
    cnt,
    latest_created_at: now.toISO(),
    latest_timestamp: Math.floor(now.toSeconds()),
  }];
}

function demoEventsIncrement(): DemoRow[] {
  const now = DateTime.now();
  const minute = Math.floor(now.toMillis() / 60000);
  const cnt = 4_000 + (minute % 61) * 180;
  return [{
    cnt,
    latest_created_at: now.toISO(),
    latest_timestamp: Math.floor(now.toSeconds()),
  }];
}

function demoEventsIncrementIntervals(): DemoRow[] {
  const now = DateTime.now();
  const minute = Math.floor(now.toMillis() / 60000);
  const rows: DemoRow[] = [];
  for (let i = 11; i >= 0; i--) {
    const ts = now.minus({ seconds: i * 5 });
    rows.push({
      cnt: 600 + ((minute * 7 + i * 13) % 300),
      latest_created_at: ts.toISO(),
      latest_timestamp: Math.floor(ts.toSeconds()),
    });
  }
  return rows;
}

function demoRepoOverview(repoId: string): DemoRow[] {
  const h = hashString(repoId);
  const stars = 50_000 + (h % 850_000);
  return [{
    repo_id: Number(repoId),
    stars,
    commits: Math.round(stars * 3.2),
    issues: Math.round(stars / 40),
    pull_request_creators: Math.round(stars / 25),
  }];
}

export function demoTrendingRepos(): DemoRow[] {
  return DEMO_REPOS.map(([owner, name], index) => {
    const h = hashString(`${owner}/${name}`);
    const stars = 20_000 + (h % 480_000);
    return {
      repo_id: 40_000_000 + index,
      repo_name: `${owner}/${name}`,
      language: ['TypeScript', 'Rust', 'Go', 'Python', 'JavaScript'][index % 5],
      description: `${owner}'s ${name} — trending on Reposcope right now.`,
      stars,
      forks: Math.round(stars / 6),
      pushes: 200 + ((h >> 5) % 900),
      pull_requests: 100 + ((h >> 8) % 600),
      contributor_logins: DEMO_ACTORS.slice(0, 5).join(','),
      collection_names: index % 3 === 0 ? 'AI Agents' : index % 3 === 1 ? 'Web Frameworks' : null,
      total_score: 60 + (h % 39),
    };
  });
}

function demoCollectionRanking(): DemoRow[] {
  return DEMO_REPOS.map(([owner, name], index) => {
    const h = hashString(`${owner}/${name}`);
    return {
      repo_id: 40_000_000 + index,
      repo_name: `${owner}/${name}`,
      current_period_growth: String(50 + (h % 900)),
      past_period_growth: String(30 + (h % 700)),
      growth_pop: String((h % 60) - 20),
      rank_pop: String((h % 5) - 2),
      total: String(10_000 + (h % 200_000)),
      current_period_rank: index + 1,
      past_period_rank: Math.max(1, index + (h % 3)),
    };
  });
}

function monthKey(monthsAgo: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() - monthsAgo;
  const shifted = new Date(year, month, 1);
  const mm = String(shifted.getMonth() + 1).padStart(2, '0');
  return `${shifted.getFullYear()}-${mm}-01`;
}

function demoStarsHistory(repoIds: unknown): DemoRow[] {
  const ids = Array.isArray(repoIds) ? repoIds.map(String) : [String(repoIds)];
  const rows: DemoRow[] = [];
  const months = 48;
  for (const id of ids) {
    const h = hashString(id);
    let total = 10 + (h % 5000);
    const growth = 1.08 + ((h >> 4) % 40) / 100;
    for (let i = months - 1; i >= 0; i--) {
      total = Math.max(1, Math.round(total * growth + ((h + i * 31) % 200) - 100));
      rows.push({
        repo_id: Number(id),
        event_month: monthKey(i),
        total,
      });
    }
  }
  return rows;
}

// --- Query dispatch ---------------------------------------------------------

export function executeDemoQuery(
  name: string,
  config: EndpointConfig,
  params: Record<string, any>,
  geo?: any,
) {
  const queryParams = prepareQueryContext(config, params);
  const start = DateTime.now();

  let data: DemoRow[];
  switch (name) {
    case 'events-increment-list':
      data = demoEventsList();
      break;
    case 'events-total':
      data = demoEventsTotal();
      break;
    case 'events-increment':
      data = demoEventsIncrement();
      break;
    case 'events-increment-intervals':
      data = demoEventsIncrementIntervals();
      break;
    case 'analyze-repo-overview':
      data = demoRepoOverview(scalar(queryParams.repoId ?? params.repoId));
      break;
    case 'analyze-stars-history':
      data = demoStarsHistory(queryParams.repoId ?? params.repoId);
      break;
    case 'trending-repos':
      data = demoTrendingRepos();
      break;
    case 'recent-hot-collections':
      data = [];
      break;
    case 'get-repo-collections':
    case 'get-repo-by-id':
    case 'get-user-by-login':
      data = [];
      break;
    default:
      // Unknown query: return empty rows instead of throwing, so no page ever
      // 500s in demo mode — charts just render empty until a DB is configured.
      data = [];
      break;
  }

  const end = DateTime.now();
  return {
    params: queryParams,
    sql: DEMO_SQL,
    types: {} as Record<string, string>,
    data,
    requestedAt: start.toISO(),
    finishedAt: end.toISO(),
    spent: end.diff(start).as('seconds'),
    geo,
  };
}
