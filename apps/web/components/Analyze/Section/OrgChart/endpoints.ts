import { INTERNAL_QUERY_API_SERVER } from '@/utils/api';

interface EndpointDef {
  endpoints: string[];
  extraParams?: string[];
}

/**
 * Maps chart names to their API endpoints.
 * Endpoint templates use {param} syntax for URL interpolation.
 * Standard API params (ownerId, period, repoIds) are always included.
 * extraParams lists additional params to pass to the API.
 */
const ENDPOINTS: Record<string, EndpointDef> = {
  // Compose: overview
  '@reposcope/widget-compose-org-overview-stars': {
    endpoints: ['orgs/stars/trends', 'orgs/stars/total'],
  },
  '@reposcope/widget-compose-org-overview-stats': {
    endpoints: ['orgs/{activity}/trends', 'orgs/{activity}/total'],
  },
  '@reposcope/widget-compose-org-active-contributors': {
    endpoints: ['orgs/participants/{activity}/ranking', 'orgs/participants/{activity}/total'],
  },
  '@reposcope/widget-compose-org-activity-active-ranking': {
    endpoints: ['orgs/{activity}/active/ranking', 'orgs/{activity}/active/total'],
  },

  // Compose: star growth
  '@reposcope/widget-compose-org-activity-growth-total': {
    endpoints: ['orgs/{activity}/trends', 'orgs/{activity}/total'],
  },
  '@reposcope/widget-compose-org-stars-top-repos': {
    endpoints: ['orgs/stars/top-repos', 'orgs/stars/total'],
  },
  '@reposcope/widget-compose-org-activity-company': {
    endpoints: ['orgs/{activity}/organizations'],
    extraParams: ['role', 'excludeSeenBefore'],
  },
  '@reposcope/widget-compose-org-activity-map': {
    endpoints: ['orgs/{activity}/locations'],
    extraParams: ['role'],
  },

  // Compose: participants
  '@reposcope/widget-compose-org-participants-growth': {
    endpoints: ['orgs/participants/{activity}/trends', 'orgs/participants/{activity}/total'],
  },
  '@reposcope/widget-compose-org-activity-new-ranking': {
    endpoints: ['orgs/{activity}/new/ranking', 'orgs/{activity}/new/total'],
  },
  '@reposcope/widget-compose-org-participants-roles-ratio': {
    endpoints: ['orgs/participants/roles'],
  },
  '@reposcope/widget-compose-org-engagement-scatter': {
    endpoints: ['orgs/participants/engagements'],
  },

  // Compose: productivity
  '@reposcope/widget-compose-org-productivity-ratio': {
    endpoints: ['orgs/{activity}-ratio'],
  },
  '@reposcope/widget-compose-org-activity-open-to-close': {
    endpoints: ['orgs/{activity}/open-to-close-duration/top-repos', 'orgs/{activity}/open-to-close-duration/medium'],
  },
  '@reposcope/widget-compose-org-activity-open-to-first-response': {
    endpoints: ['orgs/{activity}/open-to-first-response-duration/top-repos', 'orgs/{activity}/open-to-first-response-duration/medium'],
  },
  '@reposcope/widget-compose-org-pull-requests-open-to-review': {
    endpoints: ['orgs/reviews/open-to-first-review-duration/top-repos', 'orgs/reviews/open-to-first-review-duration/medium'],
  },
  '@reposcope/widget-compose-org-code-changes-top-repositories': {
    endpoints: ['orgs/commits/code-changes/top-repos'],
  },

  // Analyze: used directly in sections
  '@reposcope/widget-analyze-org-activity-efficiency': {
    endpoints: ['orgs/{activity}/actions/trends'],
  },
  '@reposcope/widget-analyze-org-activity-action-top-repos': {
    endpoints: ['orgs/{activity}/top-repos'],
  },
  '@reposcope/widget-analyze-org-commits-time-distribution': {
    endpoints: ['orgs/commits/time-distribution'],
    extraParams: ['zone'],
  },
  '@reposcope/widget-analyze-org-recent-pr-review-stats': {
    endpoints: ['orgs/reviews/review-prs/trends'],
  },
  '@reposcope/widget-analyze-org-recent-stats': {
    endpoints: ['orgs/{activity}/trends'],
  },

  // Analyze: formerly compose-only (thin wrappers removed)
  '@reposcope/widget-analyze-org-activity-map': {
    endpoints: ['orgs/{activity}/locations'],
    extraParams: ['role'],
  },
  '@reposcope/widget-analyze-org-company': {
    endpoints: ['orgs/{activity}/organizations'],
    extraParams: ['role', 'excludeSeenBefore'],
  },
  '@reposcope/widget-analyze-org-engagement-scatter': {
    endpoints: ['orgs/participants/engagements'],
  },
};

function resolveTemplate(template: string, params: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
}

function buildApiParams(params: Record<string, any>, extraKeys: string[] = []): URLSearchParams {
  const usp = new URLSearchParams();
  if (params.owner_id != null) usp.set('ownerId', String(params.owner_id));
  if (params.period != null) usp.set('period', String(params.period));
  if (params.repo_ids != null) {
    const ids = Array.isArray(params.repo_ids) ? params.repo_ids : [params.repo_ids];
    ids.forEach(id => usp.append('repoIds', String(id)));
  }
  for (const key of extraKeys) {
    if (params[key] != null) usp.set(key, String(params[key]));
  }
  return usp;
}

export interface OrgFetchResult {
  data: any[];
  /** SQL from the first endpoint response */
  sql?: string;
  /** Resolved query name for the first endpoint (for SHOW SQL / EXPLAIN) */
  queryName?: string;
}

export async function fetchChartData(
  name: string,
  params: Record<string, any>,
  signal?: AbortSignal,
): Promise<OrgFetchResult> {
  const config = ENDPOINTS[name];
  if (!config) throw new Error(`Unknown chart: ${name}`);

  const queryParams = buildApiParams(params, config.extraParams);
  let sql: string | undefined;
  let queryName: string | undefined;

  const data = await Promise.all(
    config.endpoints.map(async (template, i) => {
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
