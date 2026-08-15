import { INTERNAL_QUERY_API_SERVER } from '@/utils/api';

interface EndpointDef {
  /** API query endpoints. Templates use {param} syntax. */
  endpoints: string[];
  /** Endpoint for comparison repo (if different from main). Uses same template by default. */
  vsEndpoints?: string[];
  /** Extra params to pass to the API besides repoId. */
  extraParams?: string[];
  /** Whether this widget supports comparison (vs_repo_id). Default: true */
  supportsComparison?: boolean;
}

/**
 * Maps widget names to their API endpoints for repo analysis.
 * Widget param `repo_id` → API param `repoId`
 */
const ENDPOINTS: Record<string, EndpointDef> = {
  // --- History charts ---
  '@reposcope/widget-analyze-repo-stars-history': {
    endpoints: ['analyze-stars-history'],
  },
  '@reposcope/widget-analyze-repo-pushes-and-commits-per-month': {
    endpoints: ['analyze-pushes-and-commits-per-month'],
  },
  '@reposcope/widget-analyze-repo-loc-per-month': {
    endpoints: ['analyze-loc-per-month'],
  },
  '@reposcope/widget-analyze-repo-commits-time-distribution': {
    endpoints: ['analyze-commits-time-distribution'],
    extraParams: ['period', 'zone'],
  },

  // --- Pull requests ---
  '@reposcope/widget-analyze-repo-pull-requests-size': {
    endpoints: ['analyze-pull-requests-size-per-month'],
  },
  '@reposcope/widget-analyze-repo-pull-request-open-to-merged': {
    endpoints: ['analyze-pull-request-open-to-merged'],
  },

  // --- Issues ---
  '@reposcope/widget-analyze-repo-issue-open-to-first-responded': {
    endpoints: ['analyze-issue-open-to-first-responded'],
  },
  '@reposcope/widget-analyze-repo-issue-opened-and-closed': {
    endpoints: ['analyze-issue-opened-and-closed'],
  },

  // --- Maps (activity param in query name) ---
  '@reposcope/widget-analyze-repo-stars-map': {
    endpoints: ['analyze-{activity}-map'],
    extraParams: ['period'],
  },

  // --- Company (react-svg, activity param in query name) ---
  '@reposcope/widget-analyze-repo-company': {
    endpoints: ['analyze-{activity}-company'],
    extraParams: ['limit'],
  },

  // --- Recent (last 28 days, no comparison) ---
  '@reposcope/widget-analyze-repo-recent-stars': {
    endpoints: ['analyze-recent-stars'],
    supportsComparison: false,
  },
  '@reposcope/widget-analyze-repo-recent-commits': {
    endpoints: ['analyze-recent-commits'],
    supportsComparison: false,
  },
  '@reposcope/widget-analyze-repo-recent-issues': {
    endpoints: ['analyze-recent-issues'],
    supportsComparison: false,
  },
  '@reposcope/widget-analyze-repo-recent-pull-requests': {
    endpoints: ['analyze-recent-pull-requests'],
    supportsComparison: false,
  },
  '@reposcope/widget-analyze-repo-recent-top-contributors': {
    endpoints: ['analyze-recent-top-contributors'],
    supportsComparison: false,
  },
  '@reposcope/widget-analyze-repo-recent-contributors': {
    endpoints: ['analyze-recent-contributors'],
    supportsComparison: false,
  },
  '@reposcope/widget-analyze-repo-activity-trends': {
    endpoints: ['analyze-repo-activity-trends'],
    supportsComparison: false,
  },
};

function resolveTemplate(template: string, params: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
}

function buildApiParams(repoId: number, params: Record<string, any>, extraKeys: string[] = []): URLSearchParams {
  const usp = new URLSearchParams();
  usp.set('repoId', String(repoId));
  for (const key of extraKeys) {
    if (params[key] != null) usp.set(key, String(params[key]));
  }
  return usp;
}

export interface FetchResult {
  main: any[];
  vs?: any[];
  /** SQL from the first endpoint response */
  sql?: string;
  /** Resolved query name for the first endpoint (for SHOW SQL / EXPLAIN) */
  queryName?: string;
}

async function fetchEndpoints(
  endpoints: string[],
  repoId: number,
  params: Record<string, any>,
  extraParams: string[],
  signal?: AbortSignal,
): Promise<{ data: any[]; sql?: string; queryName?: string }> {
  const queryParams = buildApiParams(repoId, params, extraParams);
  let sql: string | undefined;
  let queryName: string | undefined;
  const data = await Promise.all(
    endpoints.map(async (template, i) => {
      const endpoint = resolveTemplate(template, params);
      const url = `${INTERNAL_QUERY_API_SERVER}/${endpoint}?${queryParams.toString()}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
      const json = await res.json();
      if (i === 0) {
        sql = json.sql;
        queryName = endpoint;
      }
      return json.data ?? [];
    }),
  );
  return { data, sql, queryName };
}

/**
 * Fetches chart data for a repo widget.
 * Returns main data, optional vs data, plus SQL info for SHOW SQL.
 */
export async function fetchRepoChartData(
  name: string,
  repoId: number,
  params: Record<string, any>,
  vsRepoId?: number,
  signal?: AbortSignal,
): Promise<FetchResult> {
  const config = ENDPOINTS[name];
  if (!config) throw new Error(`Unknown repo chart: ${name}`);

  const extraParams = config.extraParams ?? [];

  const mainResult = await fetchEndpoints(config.endpoints, repoId, params, extraParams, signal);

  let vs: any[] | undefined;
  if (vsRepoId != null && config.supportsComparison !== false) {
    const vsEps = config.vsEndpoints ?? config.endpoints;
    const vsResult = await fetchEndpoints(vsEps, vsRepoId, params, extraParams, signal);
    vs = vsResult.data;
  }

  return { main: mainResult.data, vs, sql: mainResult.sql, queryName: mainResult.queryName };
}

export function getEndpointConfig(name: string) {
  return ENDPOINTS[name];
}
