# Reposcope (formerly OSSInsight) — Deep Analysis & Improvement Plan

> Updated: 2026-08-15 (rebrand + health pass) · Author: code review session
> This document is a working map of the repo: what it is, how it fits together,
> what's broken, what's dead weight, and where to invest next.

---

## 1. Executive summary

Reposcope is a **pnpm + turbo monorepo** for an "analytics engine for the open
source ecosystem". It ingests **10+ billion GitHub events** (via GH Archive) into
**TiDB**, and serves analytics through three surfaces:

| Surface | Path | Stack |
|---|---|---|
| Main website | `apps/web` | Next.js 16 (App Router), React 19, Tailwind, ECharts, TanStack Query |
| Docs / blog / API docs | `apps/docs` | Next.js 16 + Fumadocs (MDX) |
| Public API | `packages/api-server` | Fastify v4 (56 routes), serves `api.ossinsight.io` |

Behind those sit a **TiDB-backed query layer** (`apps/web/lib/data-service` — 146+
endpoint modules generated from `configs/queries/*` SQL templates), a **data pipeline**
(`packages/pipeline`, `packages/sync-github-data`), and a **legacy Ruby-on-Rails ETL**
(`etl/`) that is no longer referenced by anything.

**Headline numbers:** ~15.3K lines of app code in `apps/web/app`, 99 components,
240 lib files, 35 chart visualizations, 89 query configs in `configs/queries`,
146 data-service endpoint modules, 56 API-server routes, 1 Playwright smoke test.

**Status: fully rebranded and green.** The repo is now **Reposcope** — new name,
new identity, new look — and `pnpm --filter web check-types` passes with **0 errors**
(down from 221 at baseline). The orphaned Rails ETL, agent-scratch files, and dead
Data Explorer UI have been removed.

## 1.1 Transformation log (2026-08-15)

| Change | Details |
|---|---|
| **Rebrand** | OSSInsight → **Reposcope**. Swept ~2,000 source files (name, URLs, `@reposcope/*` package scope, metadata, JSON-LD, llms.txt, sitemaps, OpenGraph, docs/blog). Zero brand remnants remain outside build artifacts. |
| **Identity** | New `lib/brand.ts` centralizes name/tagline/description/domain/GA — rename in one file. Tagline: *"Open source, measured in real time."* |
| **Logo + favicon** | New SVG lockup (`/logo.svg`) + pulse-mark favicon (`/favicon.svg`), wired into the header and metadata. |
| **Palette** | Cool deep-navy base + **cyan/violet** identity (`globals.css` + all hardcoded hexes swept): charts, buttons, rings, selectors, headers, OG images. |
| **Fonts** | Geist → **Space Grotesk** (web) and bundled Space Grotesk variable TTF for all 6 OG-image renderers (Poppins removed). |
| **Deletions** | `etl/` (orphaned Rails, 1.7MB), `memory/` + `.claude/` + `NOTE.md` (agent scratch), dead `explore/content.tsx` + `api/explorer` routes, legacy logo/favicon PNGs, dead `components/Analyze/chart.tsx`. |
| **Data Explorer** | Maintenance screen rewritten in English + on-brand (was Chinese). |
| **Typecheck** | **221 → 0 errors.** Fixed: endpoint-registry JSON-literal typing, echarts 5.6 internal-type paths (4 libs), React 19 `useRef()` calls, missing `@types/react` in site-shell, global JSX compat shim for rehype-react, `@types/d3-hierarchy`, plus ~30 one-off chart/lib typing fixes. |
| **Verified** | `web` + `docs` production builds pass; all 6 packages typecheck clean. |

---

## 2. Architecture map

```
┌─────────────────────────────────────────────────────────────────┐
│  GH Archive (10B+ events)                                        │
│    │                                                            │
│    ▼                                                            │
│  etl/  (legacy Rails, ORPHANED — see §6)                        │
│  packages/pipeline  (Fastify scheduler: incremental/full sync)  │
│  packages/sync-github-data  (CLI: GitHub user/repo metadata →   │
│                              TiDB Serverless via Prisma)        │
│    │                                                            │
│    ▼                                                            │
│  TiDB (gharchive_dev)  ── mv_repo_daily_engagements,            │
│                          github_repos, collections, ...         │
│    ▲                                                           │
│    │ SQL via @tidbcloud/serverless                              │
│  apps/web/lib/data-service  (edge runtime query layer)          │
│    │  ◄── configs/queries/**/{template.sql,params.json}         │
│    │  ◄── apps/web/lib/data-service/endpoints/**  (146 modules) │
│    ▼                                                           │
│  apps/web/app/api/q/[...query]  (GET /api/q/<query-name>)       │
│    │                                                            │
│    ├──► pages: /, /analyze, /analyze-user, /collections,        │
│    │         /trending, /languages, /explore, /compare, /gh,    │
│    │         /api/explorer, /api/mcp                           │
│    └──► charts/* (35 visualizers) + components/Analyze/*        │
│                                                                 │
│  packages/api-server  (public REST API, OpenAPI, rate-limited)  │
│  packages/site-shell  (shared header/footer, used by web+docs)  │
└─────────────────────────────────────────────────────────────────┘
```

### Key flows

1. **Query flow (web):** page component → `RepoChart`/`OrgChart`/`Analyze` →
   `INTERNAL_QUERY_API_SERVER` (`/api/q/<name>`) → edge route
   `app/api/q/[...query]/route.ts` → `runQuery()` → `endpoints/index.ts` registry →
   lazy `import()` of `{config, sql}` → Liquid-template render → TiDB execute.
2. **Public API flow:** `packages/api-server` routes (Fastify autoloaded) →
   per-route SQL via `configs/public_api/http_endpoints` → TiDB, rate-limited by
   Upstash/fastify-rate-limit.
3. **GitHub metadata flow:** `sync-github-data` CLI (Octokit) → Prisma → TiDB
   (`github_repos`, `github_users`, orgs).

### The endpoint registry (important gotcha)

`apps/web/lib/data-service/endpoints/index.ts` is a **hand-maintained Map** of
~146 lazy imports. Adding a query = 3 files (index.ts / template.sql / params.json)
+ 1 registry line. There is **no generator** keeping it in sync with
`configs/queries/*`, which is why two org endpoints had drifted into 404 (fixed,
see §5). **The typecheck is red at baseline** (221 errors) — including all 61
endpoint-registry lines — but `next.config.mjs` sets `typescript.ignoreBuildErrors: true`,
so `next build` succeeds and CI never catches it. This is the single cheapest
"make it healthy" win available.

---

## 3. What exists, surface by surface

### apps/web (main site)
- **Home** (`app/page.tsx`, `home-content.tsx`, `ai-home-content.tsx`): hero with
  `SELECT AI_insights FROM <n> GitHub events`, collections grid, blog links.
- **Repo analytics** (`app/analyze/(repo)/[owner]/[repo]/`): 7 sections
  (overview, people, commits, pull-requests, issues, repository, contributors),
  all client-rendered with TanStack Query; ECharts + react-svg visualizers.
- **Compare** (`app/compare/[o1]/[r1]/[o2]/[r2]/`): reuses `RepoAnalyzePage` with
  `vsRepoInfo`; all compare-capable charts dual-series with `main`/`vs` axes.
- **Org analytics** (`app/analyze/(org)/[owner]/`): overview cards + star growth +
  participant + productivity + issue sections (rebuilt recently — NOTE.md's org
  breakage report is **stale**; current sections hit registered endpoints).
- **Developer analytics** (`app/analyze-user/[login]/`): 13 `personal-*` queries.
- **Trending** (`app/trending/`): materialized-view driven
  (`loadTrendingReposFromMaterializedView` in routes.ts, 10-min cache).
- **Collections** (`app/collections/`): curated repo lists + monthly rankings.
- **Languages** (`app/languages/`): per-language pages.
- **Data Explorer** (`app/explore/`): **DISABLED** — page renders a Chinese
  "maintenance" screen (`maintenance.tsx`) while the full client UI
  (`content.tsx`, ~700 lines) sits unused in the tree. Also unused:
  `app/api/explorer/{ask,tags}/route.ts`, api-server `explorer/*` routes.
- **MCP server** (`app/api/mcp/route.ts`): exposes GitHub data via Model Context
  Protocol (AI-era feature).
- **gh proxy** (`app/gh/**`): thin server routes proxying the GitHub API for the
  repo/user selectors.

### apps/docs
Fumadocs-based docs/blog (68 content files incl. `legacy-content`). Blog posts are
MDX; some embed legacy charts that were degraded to archive placeholders
(`src/components/CommonChart.tsx`, `ContributorsCharts.tsx`). Docs/API pages still
carry double chrome (site header + fumadocs shell) per NOTE.md.

### packages/api-server (public API)
Fastify v4, 56 routes: `v1/` (repos stargazers/issue_creators/pull_request_creators,
collections, trends), `gh/` (search + lookups), `explorer/`, `playground/sql/generate`
(LLM → SQL), `qo/` (ossinsight query executor). Rate limits, OpenAPI generation
(`gen:public-api-docs`), metrics (prom-client), Sentry, Redis caching.

### packages/pipeline + sync-github-data
Data ingestion: pipeline (Fastify + toad-scheduler/node-schedule) and a CLI
(`sync-github-data` with commands/). TiDB Serverless via `@tidbcloud/serverless`
or Prisma. **Not runnable without real GH tokens + a TiDB cluster.**

### configs
- `configs/queries/` — 89 SQL-templated query definitions (Liquid engine).
  **Source of truth** for the web query layer.
- `configs/public_api/` — OpenAPI spec + SQL for the public API.

---

## 4. Verified findings (this session)

| # | Finding | Severity | Evidence |
|---|---|---|---|
| 1 | `orgs/repos/active/ranking` and `orgs/repos/active/total` returned 404: configs exist in `configs/queries/orgs/repos/active/`, wrapper files + registry entries missing in `apps/web/lib/data-service` | Fixed in this pass (wrappers added + registered; same TS2322 class as all 61 pre-existing registry lines) | `endpoints/index.ts` grep |
| 2 | `tsc --noEmit` fails with 221 errors at baseline; `check-types` is therefore useless as a gate; next build hides it via `ignoreBuildErrors` | High (health) | `pnpm --filter web check-types` |
| 3 | Data Explorer fully disabled in production but ~700-line `explore/content.tsx` + explorer API routes remain in tree (maintenance-mode commit `1d179f1`) | Medium (dead code) | `app/explore/page.tsx` imports only `maintenance.tsx` |
| 4 | `etl/` (Rails, 1.7MB, db/schema, migrations, tests) is referenced by no script/package in the monorepo | Medium (dead code) | grep across `package.json`s |
| 5 | `memory/` contains AI-agent scratch (scan results, issue drafts, "growth analysis", `.json` dumps) committed to the repo; `NOTE.md` (live audit) is genuinely useful but ~5 months stale — several "known bugs" it lists are already fixed (org page rebuilt) or unverifiable | Low (hygiene) | file contents |
| 6 | Compare-mode chart error `yAxis "vs" not found` (NOTE.md): mechanism understood — series reference `yAxisId: 'vs'` via `compare([main, vs], ...)` while axes are gated on `!!ctx.getRepo(...)`; a mismatch occurs when vs data exists but the vs repo lookup fails. Reproducible only with a live DB; needs a runtime test to confirm which chart(s) | Medium (runtime) | `charts-utils/visualizer/analyze.ts`, `options/utils/analyze.ts` |
| 7 | `apps/web/app/gh` routes + `app/api/q` + `app/api/queries` all exist; `/api/q` sets `no-store`, `/api/queries` sets CDN caches — overlapping surfaces | Low (consolidation) | route files |
| 8 | Homepage hero events total comes from `events-total` query; renders `0` without a live DB (NOTE.md) — by design for local, cosmetic on prod | Low | `home-content.tsx:759-800` |
| 9 | Endpoint registry drift: `configs/queries/` has 89 entries, registry has 146 (some web-only), and nothing validates configs ↔ registry ↔ `configs/public_api` consistency | Medium (tooling) | counts |
| 10 | `scripts/verify-collection.mjs` + CI workflow exist for collections; no CI runs typecheck/build/tests | Medium (CI) | `.github/workflows/*` |

---

## 5. Changes made in earlier passes

1. **Restored the two missing org endpoints** (API parity):
   - Added `apps/web/lib/data-service/endpoints/orgs/repos/active/{ranking,total}/`
     (`index.ts`, `template.sql`, `params.json` — copied from the canonical
     `configs/queries/orgs/repos/active/*`) and registered both.
2. **Documented everything** in this file.

---

## 6. Removal candidates (need your call — destructive)

| Candidate | Size | Why remove | Risk |
|---|---|---|---|
| `etl/` Rails app | 1.7MB | Orphaned; modern pipeline is `packages/pipeline` + `sync-github-data` | You may still want it for your own ETL deploy; it's self-contained (own Gemfile) so deleting is clean, but keep a copy if you plan to rebuild the pipeline |
| `memory/` scratch | 152KB | Agent artifacts (issue drafts referencing external GH issues, scan JSON, stale growth analyses) | `NOTE.md` is worth keeping/updating |
| `explore/content.tsx` + explorer API routes | ~50KB | Disabled by maintenance mode | Removing kills the ability to re-enable quickly; better to re-enable or fully delete |
| `.claude/settings.json` | 1 file | Tool-specific | Trivial |
| Duplicate query surface (`/api/q` vs `/api/queries`) | — | Two routes doing the same thing with different cache headers | Consolidate after checking external consumers |

**Not touched** (deliberately): `apps/web/app/gh/**` (live GitHub proxy), the docs
`legacy-content` (published docs), and any query config whose endpoint might be
consumed externally via the public API.

---

## 7. Improvement roadmap (prioritized)

### P0 — Health (do first, cheap, high signal)
1. **Fix the typecheck at baseline.** Root-cause the 221 `TS2322` errors in
   `endpoints/index.ts` + site-shell react-types resolution; then re-enable
   `check-types` in CI. This converts "build works by luck" into a real gate.
2. **Generate the endpoint registry.** Replace the hand-maintained
   `endpoints/index.ts` with a tiny script (`scripts/gen-endpoints.mjs`) that scans
   `configs/queries/**` + the endpoints dir and emits the Map. Kills drift (finding #9)
   and makes future query additions one-file.
3. **Add CI for typecheck + build + smoke test.** There is exactly one Playwright
   smoke test (`apps/web/tests/smoke.spec.ts`); wire it into GitHub Actions.

### P1 — Product polish
4. **Root-cause and fix the compare-mode `yAxis "vs"` error** (needs a live TiDB or
   a mock datasource). Plan: unit-test the visualizers with mocked input where
   `vs_repo_id` present but repo lookup fails; align axis generation with series
   generation in every repo visualizer.
5. **Re-enable or delete Data Explorer.** The maintenance screen is Chinese-only on
   an English product; either restore `explore/content.tsx` (it's finished) behind
   the existing `explorer/*` API, or remove it cleanly.
6. **Homepage hero count:** cache `events-total` server-side (10 min) so the hero
   never idles at 0.

### P2 — Scope for "make it your project"
7. **Rebrand/rename pass** — swap OSSInsight/PingCAP branding in `site.config.ts`,
   layout metadata, llms.txt, opensearch.xml, README.
8. **Local-first setup** — add a `docker-compose.yml` with TiDB/MySQL + seed script
   so `pnpm dev` works without a remote cluster (currently requires `DATABASE_URL`).
9. **Docs:** remove the double-header chrome, restore legacy blog chart embeds or
   convert to static SVGs, finish the English UX (maintenance screen etc.).
10. **Public API SDK** (from growth-analysis memory): the repo has OpenAPI but no
    official TS/Python SDK or CLI — a natural differentiator for a personal project.

---

## 8. How to run

```bash
pnpm install                 # needs Node >= 20.9, pnpm 10
export DATABASE_URL="tidb://..."   # TiDB Serverless connection (required for queries)
pnpm dev                    # web on http://localhost:3001
pnpm dev:docs               # docs on :3002
pnpm --filter api-server dev   # public API on :3450
pnpm --filter web check-types  # green (fixed from 221 errors — see §4.2)
```

## 9. Transformation log

- **Reposcope Score** (`lib/reposcope-score.ts`, `app/api/score/[owner]/[repo]`):
  proprietary 0–100 health/activity metric computed live from GitHub's public
  API (no DB). Weights: popularity 30%, velocity 30%, maintenance 20%, community
  10%, longevity 10%. Shown as a gauge card on every repo page.
- **Pulse API** (`app/api/pulse`): proxies GitHub's public events API (cached
  45s, normalized to the homepage ticker's event shape). The homepage ticker
  falls back to it when the analytics DB is unavailable — the site stays alive
  with zero backend.
- **Badge API** (`app/api/badge/[...path]`): added the `score` metric
  (grade-colored), alongside stars/forks/issues/contributors/language/license.
