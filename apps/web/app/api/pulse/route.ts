import { NextRequest } from 'next/server';

/**
 * Reposcope Pulse API.
 *
 *   GET /api/pulse
 *
 * A live feed of GitHub-wide activity, proxied from GitHub's public events
 * API and normalized to the shape the homepage ticker renders. No database
 * required — this is what keeps the homepage alive when the analytics DB is
 * unavailable:
 *
 *   { "data": [{ "id": 123, "type": "WatchEvent", "repo_name": "facebook/react",
 *               "actor_login": "octocat", "number": 0, "action": "started",
 *               "pr_merged": null }], "fetchedAt": "..." }
 */

export const runtime = 'edge';

const GITHUB_API = 'https://api.github.com';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=180',
  'CDN-Cache-Control': 'public, s-maxage=45',
};

/** Event types the homepage ticker knows how to render. */
const INTERESTING_TYPES = new Set([
  'PushEvent',
  'WatchEvent',
  'ForkEvent',
  'IssuesEvent',
  'PullRequestEvent',
  'PullRequestReviewEvent',
  'PullRequestReviewCommentEvent',
  'IssueCommentEvent',
  'ReleaseEvent',
  'CreateEvent',
  'MemberEvent',
]);

interface PulseEvent {
  id: string;
  type?: string;
  actor?: { login?: string };
  repo?: { name?: string };
  payload?: {
    action?: string;
    number?: number;
    issue?: { number?: number };
    pull_request?: { number?: number; merged?: boolean };
  };
}

export interface GHEvent {
  id: number;
  type: string;
  repo_name: string;
  actor_login: string;
  number: number;
  action: string;
  pr_merged: 0 | 1 | null;
}

function normalizeEvent(event: PulseEvent): GHEvent | null {
  if (!event.type || !INTERESTING_TYPES.has(event.type)) return null;
  const numericId = Number.parseInt(event.id, 10);
  return {
    id: Number.isFinite(numericId) ? numericId : 0,
    type: event.type,
    repo_name: event.repo?.name ?? '',
    actor_login: event.actor?.login ?? '',
    number:
      event.payload?.pull_request?.number ??
      event.payload?.issue?.number ??
      event.payload?.number ??
      0,
    action: event.payload?.action ?? '',
    pr_merged: event.payload?.pull_request?.merged ? 1 : 0,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(`${GITHUB_API}/events?per_page=100`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Reposcope/1.0 (+https://reposcope.io)',
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return Response.json(
        { data: [], fetchedAt: new Date().toISOString(), error: `github ${res.status}` },
        { status: 200, headers: { 'Content-Type': 'application/json', ...CACHE_HEADERS } },
      );
    }

    const events = (await res.json().catch(() => [])) as PulseEvent[];
    const seen = new Set<number>();
    const data: GHEvent[] = [];
    for (const event of events) {
      const normalized = normalizeEvent(event);
      if (!normalized || normalized.id === 0 || seen.has(normalized.id)) continue;
      seen.add(normalized.id);
      data.push(normalized);
      if (data.length >= 25) break;
    }

    return Response.json(
      { data, fetchedAt: new Date().toISOString() },
      { status: 200, headers: { 'Content-Type': 'application/json', ...CACHE_HEADERS } },
    );
  } catch {
    return Response.json(
      { data: [], fetchedAt: new Date().toISOString(), error: 'unavailable' },
      { status: 200, headers: { 'Content-Type': 'application/json', ...CACHE_HEADERS } },
    );
  }
}
