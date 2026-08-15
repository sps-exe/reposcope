import type { ExecuteArgs, FullResult } from '@tidbcloud/serverless';
import { BIG_NUMBER_TYPES } from './executor/utils';
import { getTiDBConnection } from './connection';
import { isDemoMode } from './executor/demo';

export type QueryRows = Record<string, any>[];

export async function executeSQL(
  statement: string,
  args: ExecuteArgs = null,
  signal?: AbortSignal,
) {
  // Demo mode (no DATABASE_URL): return an empty result instead of throwing,
  // so server-rendered pages (trending, collections, languages, analyze) render
  // gracefully with zero backend. Live data takes over when DATABASE_URL is set.
  if (isDemoMode()) {
    return { statement, types: {}, rows: [] } as FullResult;
  }

  const tidb = getTiDBConnection();
  const result = await tidb.execute(statement, args, {
    fullResult: true,
  }) as FullResult;
  signal?.throwIfAborted();
  return result;
}

function normalizeRows(result: FullResult): QueryRows {
  return (result.rows ?? []).map((row: Record<string, any>) => {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (result.types && BIG_NUMBER_TYPES.includes(result.types[key])) {
          return [key, Number(value)];
        }
        return [key, value];
      }),
    );
  });
}
