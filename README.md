<h1 align="center">Reposcope</h1>

<p align="center">
  <b>Open source, measured in real time.</b><br/>
  Analyze 10+ billion GitHub events — stars, contributors, pull requests, issues,<br/>
  and the repositories shaping software, all in one live dashboard.
</p>

<div align="center">
  <a href="https://reposcope.io">
    <img src="apps/web/public/img/explore-logo-layer-0.png" alt="Reposcope" width="240" />
  </a>
</div>

<h4 align="center">
  <a href="https://reposcope.io/analyze/facebook/react">Repository Analytics</a>
  • <a href="https://reposcope.io/analyze-user/torvalds">Developer Analytics</a>
  • <a href="https://reposcope.io/trending">Trending</a>
  • <a href="https://reposcope.io/collections/open-source-database">Collections</a>
  • <a href="https://reposcope.io/languages">Languages</a>
  • <a href="https://reposcope.io/explore">Data Explorer</a>
  • <a href="https://reposcope.io/docs">Docs &amp; API</a>
</h4>

---

## What is Reposcope?

Reposcope is an analytics engine for the open source ecosystem. It ingests
**10+ billion rows of GitHub event data** (GH Archive) into TiDB and turns them
into live, queryable insight — measured in commits, stars, forks, and
contributors, not hype.

### For developers

- **Repository Analytics** — star growth, contributor origins, geographic
  distribution, company breakdown, PR/issue efficiency for any repo
  (`/analyze/:owner/:repo`)
- **Developer Analytics** — contribution patterns, code-review cadence,
  collaboration networks (`/analyze-user/:login`)
- **Organization Analytics** — participant engagement, productivity, and
  community metrics for any GitHub org (`/analyze/:owner`)
- **Compare Projects** — side-by-side comparison of any two repos on any metric
  (`/compare/a/b/c/d`)
- **Trending** — what's gaining velocity right now, including AI repos
- **60+ Curated Collections** — from databases to Web3 to AI agent frameworks

### For researchers & analysts

- **Reposcope Score** — a proprietary 0–100 health & activity score for any
  repository (popularity, velocity, maintenance, community, longevity), computed
  live from GitHub with no database required. Shown on every repo page and
  available via `GET /api/score/:owner/:repo`.
- **Live Pulse feed** — the homepage ticker streams real GitHub-wide activity;
  it falls back to GitHub's public events API when the analytics DB is
  unavailable, so the site never goes quiet.
- **Public API** — a rate-limited, documented REST API
  (`api.reposcope.io`) with OpenAPI spec
- **Live README Badges** — embed live repo stats in any README with a single
  image URL (no account, no JS, 6-hour CDN cache):

  ```md
  [![stars](https://reposcope.io/api/badge/facebook/react/stars)](https://reposcope.io/analyze/facebook/react)
  [![forks](https://reposcope.io/api/badge/facebook/react/forks)](https://reposcope.io/analyze/facebook/react)
  [![issues](https://reposcope.io/api/badge/facebook/react/issues)](https://reposcope.io/analyze/facebook/react)
  [![contributors](https://reposcope.io/api/badge/facebook/react/contributors)](https://reposcope.io/analyze/facebook/react)
  [![language](https://reposcope.io/api/badge/facebook/react/language)](https://reposcope.io/analyze/facebook/react)
  [![score](https://reposcope.io/api/badge/facebook/react/score)](https://reposcope.io/analyze/facebook/react)

  Metrics: `stars`, `forks`, `issues`, `contributors`, `language`, `license`,
  and `score` (the Reposcope Score).
  ```

  Supported metrics: `stars`, `forks`, `issues`, `contributors`, `language`, `license`.
- **Data Explorer** — ask questions about GitHub data in natural language,
  get SQL + visualizations
- **MCP Server** — expose GitHub ecosystem data to AI agents over the
  Model Context Protocol (`/api/mcp`)
- **Docs & Blog** — data-driven analysis of open source trends

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS, ECharts, TanStack Query |
| Docs | Next.js + Fumadocs (MDX) |
| API | Fastify v4 (public API) + Next.js edge routes (site queries) |
| Database | TiDB Serverless (`@tidbcloud/serverless`) |
| Data pipeline | `packages/pipeline` (scheduler) + `packages/sync-github-data` (CLI) |
| Monorepo | pnpm workspaces + Turbo |

## Architecture

```
GH Archive (10B+ events)
   │
   ▼
packages/pipeline ──► TiDB ──► apps/web/lib/data-service (146 SQL endpoints)
packages/sync-github-data          │
                                   ▼
                          /api/q/<query>  ◄── configs/queries/** (SQL templates)
                                   │
                    ├── pages (repo / developer / org analytics, trending,
                    │            collections, languages, compare)
                    └── packages/api-server (public REST API)
```

Every site query is a Liquid-templated SQL file in `configs/queries/**` wrapped
by a thin endpoint module — adding a metric is usually a one-file change.

## Getting started

> Requires **Node.js ≥ 20.9** and **pnpm 10**.

```bash
pnpm install
export DATABASE_URL="tidb://<your-tidb-serverless-connection-string>"
pnpm dev                # web app → http://localhost:3001
pnpm dev:docs           # docs & blog → http://localhost:3002
pnpm --filter api-server dev   # public API → http://localhost:3450
```

### Useful commands

```bash
pnpm --filter web check-types   # typecheck the web app (passes clean)
pnpm --filter web build         # production build
pnpm dev:all                    # web + docs together
```

## Monorepo layout

```
apps/
  web/          Main website (Next.js)
  docs/         Docs, blog, and API documentation (Fumadocs)
packages/
  api-server/   Public REST API (Fastify, OpenAPI)
  pipeline/     Scheduled data pipelines
  sync-github-data/  GitHub metadata CLI (Octokit → TiDB)
  site-shell/   Shared header / shell used by web + docs
  types/        Shared TypeScript types
  prefetch/     Server-side data prefetch helpers
configs/
  queries/      SQL query templates (the site's query layer)
  public_api/   Public API config + OpenAPI spec
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Add a new collection, fix a chart,
or ship a brand-new metric — PRs are welcome.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
