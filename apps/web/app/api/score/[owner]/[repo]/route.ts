import { NextRequest } from 'next/server';
import { computeReposcopeScore, type ScoreInput } from '@/lib/reposcope-score';

/**
 * Reposcope Score API.
 *
 *   GET /api/score/:owner/:repo
 *
 * Returns the 0–100 Reposcope Score for a repository, computed live from
 * GitHub's public API (no auth, no database needed):
 *
 *   {
 *     "owner": "facebook",
 *     "repo": "react",
 *     "score": 87,
 *     "grade": "Exceptional",
 *     "dimensions": { "popularity": { "score": 92, "weight": 30 }, ... },
 *     "meta": { "stars": 247000, "forks": 51000, ... }
 *   }
 *
 * Responses are cached for an hour; a small in-memory TTL cache protects the
 * GitHub rate limit between CDN cache misses.
 */

export const runtime = 'edge';

const GITHUB_API = 'https://api.github.com';
const HOUR = 60 * 60;

const CACHE_HEADERS = {
  'Cache-Control': `public, s-maxage=${HOUR}, stale-while-revalidate=${HOUR * 6}`,
  'CDN-Cache-Control': `public, s-maxage=${HOUR}`,
};

// --- In-memory TTL cache (per instance) ------------------------------------

const memoryCache = new Map<string, { ts: number; body: string }>();
const MEMORY_TTL = 10 * 60 * 1000;

function cacheGet(key: string): string | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > MEMORY_TTL) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry.body;
}

function cacheSet(key: string, body: string): void {
  memoryCache.set(key, { ts: Date.now(), body });
}

// --- GitHub helpers --------------------------------------------------------

interface GitHubResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

async function fetchGitHub<T>(path: string): Promise<GitHubResult<T>> {
  const res = await fetch(`${GITHUB_API}/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Reposcope/1.0 (+https://reposcope.io)',
    },
    next: { revalidate: HOUR },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** Variant of fetchGitHub that also surfaces response headers (for pagination). */
async function fetchGitHubWithHeaders(path: string): Promise<
  GitHubResult<unknown> & { headers: Headers }
> {
  const res = await fetch(`${GITHUB_API}/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Reposcope/1.0 (+https://reposcope.io)',
    },
    next: { revalidate: HOUR },
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}

/** GitHub's stats endpoints answer 202 while the report is being computed. */
async function fetchGitHubWithRetry<T>(
  path: string,
  attempts = 3,
): Promise<GitHubResult<T>> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await fetchGitHub<T>(path);
    if (result.status !== 202 || attempt === attempts - 1) return result;
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw new Error('unreachable');
}

interface GitHubRepo {
  stargazers_count?: number;
  forks_count?: number;
  watchers_count?: number;
  open_issues_count?: number;
  created_at?: string;
  pushed_at?: string;
}

type WeeklyActivity = { total?: number; week?: number }[];

function parseContributorsTotal(linkHeader: string | null): number {
  if (!linkHeader) return 0;
  const match = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  if (!match) return 0;
  const lastPage = parseInt(match[1], 10);
  return Number.isFinite(lastPage) ? lastPage : 0;
}

function extractWeeklyCommits(activity: WeeklyActivity): number[] {
  if (!Array.isArray(activity)) return [];
  return activity.map((week) => week?.total ?? 0);
}

// --- Route ------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner: rawOwner, repo: rawRepo } = await ctx.params;
  const owner = decodeURIComponent(rawOwner);
  const repo = decodeURIComponent(rawRepo);

  if (!owner || !repo) {
    return Response.json({ error: 'invalid request' }, { status: 400 });
  }

  const cacheKey = `${owner}/${repo}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CACHE_HEADERS },
    });
  }

  const [repoResult, contributorsResult, activityResult] = await Promise.all([
    fetchGitHub<GitHubRepo>(`repos/${owner}/${repo}`),
    fetchGitHubWithHeaders(`repos/${owner}/${repo}/contributors?per_page=1&anon=true`),
    fetchGitHubWithRetry<WeeklyActivity>(
      `repos/${owner}/${repo}/stats/commit_activity`,
    ),
  ]);

  if (!repoResult.ok) {
    return Response.json(
      { error: repoResult.status === 404 ? 'repo not found' : 'unavailable' },
      { status: repoResult.status === 404 ? 404 : 502 },
    );
  }

  const data = repoResult.data;
  const weeklyCommits = extractWeeklyCommits(activityResult.data);
  const input: ScoreInput = {
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    watchers: data.watchers_count ?? 0,
    openIssues: data.open_issues_count ?? 0,
    contributors: parseContributorsTotal(
      contributorsResult.status === 200 ? contributorsResult.headers.get('link') : null,
    ),
    createdAt: data.created_at ?? new Date().toISOString(),
    pushedAt: data.pushed_at ?? new Date().toISOString(),
    weeklyCommits,
    hasCommitActivity:
      activityResult.ok &&
      activityResult.status === 200 &&
      weeklyCommits.length > 0,
  };

  const body = JSON.stringify({
    owner,
    repo,
    ...computeReposcopeScore(input),
    meta: {
      stars: input.stars,
      forks: input.forks,
      watchers: input.watchers,
      openIssues: input.openIssues,
      contributors: input.contributors,
      createdAt: input.createdAt,
      pushedAt: input.pushedAt,
      commitActivity: weeklyCommits.length > 0,
    },
  });

  cacheSet(cacheKey, body);
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CACHE_HEADERS },
  });
}
