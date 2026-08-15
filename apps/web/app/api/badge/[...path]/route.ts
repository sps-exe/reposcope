import { NextRequest } from 'next/server';
import { computeReposcopeScore, type ScoreInput } from '@/lib/reposcope-score';

/**
 * Reposcope badge API.
 *
 * Renders shields-style SVG badges for any public GitHub repository, e.g.:
 *
 *   https://reposcope.io/api/badge/facebook/react/stars
 *   https://reposcope.io/api/badge/facebook/react/forks
 *   https://reposcope.io/api/badge/facebook/react/issues
 *   https://reposcope.io/api/badge/facebook/react/language
 *   https://reposcope.io/api/badge/facebook/react/license
 *   https://reposcope.io/api/badge/facebook/react/contributors
 *   https://reposcope.io/api/badge/facebook/react/score
 *
 * Data comes from GitHub's public API (no auth, no DB needed) and is cached
 * for six hours at the CDN — badges are meant to be embedded in READMEs.
 */

export const runtime = 'edge';

const METRICS = ['stars', 'forks', 'issues', 'contributors', 'language', 'license', 'score'] as const;
type Metric = (typeof METRICS)[number];

const SIX_HOURS = 60 * 60 * 6;
const CACHE_HEADERS = {
  'Cache-Control': `public, s-maxage=${SIX_HOURS}, stale-while-revalidate=${SIX_HOURS * 6}`,
  'CDN-Cache-Control': `public, s-maxage=${SIX_HOURS}`,
};

// Brand palette
const LABEL_BG = '#1d2333';
const VALUE_BG = '#22d3ee';
const VALUE_FG = '#04121a';
const BORDER = 'rgba(0,0,0,0.22)';

const FONT = "11px 'Segoe UI', 'DejaVu Sans', Verdana, sans-serif";

interface GitHubRepo {
  full_name?: string;
  stargazers_count?: number;
  forks_count?: number;
  watchers_count?: number;
  open_issues_count?: number;
  created_at?: string;
  pushed_at?: string;
  language?: string | null;
  license?: { spdx_id?: string | null } | null;
}

type WeeklyActivity = { total?: number }[];

type BadgeSpec = { label: string; value: string; color?: string };

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const [rawOwner, rawRepo, rawMetric = 'stars'] = path;
  const owner = decodeURIComponent(rawOwner ?? '');
  const repo = decodeURIComponent(rawRepo ?? '');

  const origin = req.headers.get('origin');
  const cors: Record<string, string> = origin
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
    : {};

  if (!owner || !repo || !METRICS.includes(rawMetric as Metric)) {
    return badgeResponse(errorBadge('badge', 'invalid request'), cors);
  }

  const metric = rawMetric as Metric;

  const needsCommunity = metric === 'contributors' || metric === 'score';

  const [repoResult, contributorsResult, activityResult] = await Promise.all([
    fetchGitHub<GitHubRepo>(`repos/${owner}/${repo}`),
    needsCommunity
      ? fetchGitHub<GitHubRepo[]>(`repos/${owner}/${repo}/contributors?per_page=1&anon=true`)
      : Promise.resolve(undefined),
    metric === 'score'
      ? fetchGitHub<WeeklyActivity>(`repos/${owner}/${repo}/stats/commit_activity`)
      : Promise.resolve(undefined),
  ]);

  if (!repoResult.ok) {
    const label = repoResult.status === 404 ? 'repo not found' : 'unavailable';
    return badgeResponse(errorBadge(metric, label), cors, repoResult.status);
  }

  const data = repoResult.data;
  let badge: BadgeSpec;

  switch (metric) {
    case 'stars':
      badge = numberBadge('stars', data.stargazers_count);
      break;
    case 'forks':
      badge = numberBadge('forks', data.forks_count);
      break;
    case 'issues':
      badge = numberBadge('open issues', data.open_issues_count);
      break;
    case 'language':
      badge = textBadge('language', data.language ?? '—');
      break;
    case 'license':
      badge = textBadge('license', data.license?.spdx_id ?? '—');
      break;
    case 'contributors': {
      const total = parseContributorsTotal(contributorsResult?.headers);
      badge = numberBadge('contributors', total);
      break;
    }
    case 'score': {
      const activity = Array.isArray(activityResult?.data)
        ? (activityResult.data as WeeklyActivity).map((week) => week?.total ?? 0)
        : [];
      const hasActivity =
        Boolean(activityResult?.ok) && activityResult?.status === 200 && activity.length > 0;
      const input: ScoreInput = {
        stars: data.stargazers_count ?? 0,
        forks: data.forks_count ?? 0,
        watchers: data.watchers_count ?? 0,
        openIssues: data.open_issues_count ?? 0,
        contributors: parseContributorsTotal(contributorsResult?.headers) ?? 0,
        createdAt: data.created_at ?? new Date().toISOString(),
        pushedAt: data.pushed_at ?? new Date().toISOString(),
        weeklyCommits: activity,
        hasCommitActivity: hasActivity,
      };
      const score = computeReposcopeScore(input);
      badge = {
        label: 'reposcope score',
        value: `${score.score} ${score.grade}`,
        color: scoreColor(score.score),
      };
      break;
    }
  }

  return badgeResponse(badge, cors);
}

// --- GitHub helpers -------------------------------------------------------

const GITHUB_API = 'https://api.github.com';

async function fetchGitHub<T>(path: string): Promise<{ ok: boolean; status: number; data: T; headers: Headers }> {
  const res = await fetch(`${GITHUB_API}/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      // GitHub requires a User-Agent; the site's own name is fine.
      'User-Agent': 'Reposcope/1.0 (+https://reposcope.io)',
    },
    next: { revalidate: SIX_HOURS },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}

function parseContributorsTotal(headers?: Headers): number | undefined {
  if (!headers) return undefined;
  const link = headers.get('link') ?? '';
  // GitHub returns: <...?page=N&per_page=1>; rel="last"
  const match = link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  if (!match) return undefined;
  const lastPage = parseInt(match[1], 10);
  return Number.isFinite(lastPage) && lastPage > 0 ? lastPage : undefined;
}

// --- Badge rendering ------------------------------------------------------

function numberBadge(label: string, value: number | undefined): BadgeSpec {
  return { label, value: value == null ? '—' : formatCompact(value) };
}

function textBadge(label: string, value: string): BadgeSpec {
  return { label, value: value || '—' };
}

function errorBadge(label: string, value: string): BadgeSpec {
  return { label, value, color: '#7d8496' };
}

function scoreColor(score: number): string {
  if (score >= 85) return '#22d3ee';
  if (score >= 70) return '#a78bfa';
  if (score >= 55) return '#34d399';
  if (score >= 40) return '#fbbf24';
  return '#7d8496';
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Rough text width estimation (shields-style heuristic). */
function textWidth(text: string, fontSize = 11): number {
  let width = 0;
  for (const ch of text) {
    // Average glyph width ≈ 0.58 * font size; wide chars take more.
    width += (ch.charCodeAt(0) > 0x2ff ? 1.15 : 0.58) * fontSize;
  }
  return width;
}

function renderBadge({ label, value, color = VALUE_BG }: BadgeSpec): string {
  const hPad = 5;
  const labelW = Math.ceil(textWidth(label)) + hPad * 2;
  const valueW = Math.ceil(textWidth(value)) + hPad * 2;
  const width = labelW + valueW;
  const height = 20;

  const labelX = hPad;
  const valueX = labelW + hPad;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
  <title>${escapeXml(label)}: ${escapeXml(value)}</title>
  <rect width="${width}" height="${height}" fill="${LABEL_BG}" rx="3"/>
  <rect x="${labelW}" width="${valueW}" height="${height}" fill="${color}" rx="3"/>
  <rect x="${labelW}" width="1" height="${height}" fill="${BORDER}"/>
  <g fill="#ffffff" font-family="'Segoe UI', 'DejaVu Sans', Verdana, sans-serif" font-size="11" text-anchor="middle">
    <text x="${labelX + labelW / 2}" y="14">${escapeXml(label)}</text>
    <text x="${valueX + valueW / 2}" y="14" fill="${VALUE_FG}" font-weight="600">${escapeXml(value)}</text>
  </g>
</svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function badgeResponse(spec: BadgeSpec, cors: Record<string, string>, status = 200) {
  return new Response(renderBadge(spec), {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      ...CACHE_HEADERS,
      ...cors,
    },
  });
}
