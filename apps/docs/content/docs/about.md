---
sidebar_position: 1
title: About Reposcope
description: Reposcope is a live open source analytics platform. Score any GitHub repository, watch real-time activity, compare projects, and embed live badges — no account, no database, no setup.
hide_title: true
---

<h1 align="center"> About Reposcope 👁️</h1>

<h3 align="center">
  <b><a href="/analyze">Repository Analytics</a></b>
  •
  <b><a href="/compare">Compare</a></b>
  •
  <b><a href="/collections">Collections</a></b>
  •
  <b><a href="/trending">Trending</a></b>
  •
  <b><a href="/languages">Languages</a></b>
  •
  <b><a href="/blog">Blog</a></b>
  •
  <b><a href="https://github.com/sps-exe/reposcope">Source Code</a></b>
</h3>

Reposcope is a live, real-time analytics platform for the open source world. Point it at any GitHub repository, developer, or organization and it gives you a full picture of health, activity, and momentum — scored, compared, and embeddable in seconds.

## Reposcope Score

The signature Reposcope metric: a **0–100 health score** for any repository, computed live from GitHub's public API across five weighted dimensions:

- **Popularity (30%)** — stars, forks, watchers
- **Velocity (30%)** — recent commits, releases, activity
- **Maintenance (20%)** — open-to-close issue and PR response times
- **Community (10%)** — contributor diversity
- **Longevity (10%)** — project age and history

Every repo page shows a live radial gauge with dimension breakdowns. No database, no account — just enter a repo and get a score.

## Live Pulse

The homepage streams **real GitHub events in real time** — pushes, stars, PRs, issues, merges — straight from GitHub's public events feed. Open Reposcope and watch the open source world move.

## README Badges

Embed live repo stats in any README with a single image URL — no account, no JavaScript, 6-hour CDN cache:

```md
[![stars](https://reposcope.io/api/badge/facebook/react/stars)](https://reposcope.io/analyze/facebook/react)
[![score](https://reposcope.io/api/badge/facebook/react/score)](https://reposcope.io/analyze/facebook/react)
```

Metrics: `stars`, `forks`, `issues`, `contributors`, `language`, `license`, `score`.

## Deep Analytics

- **Repository Analytics** — stars, forks, issues, commits, pull requests, contributors, languages, and line-of-code changes over time, plus geographical and company distribution of stargazers and contributors.
- **Developer Analytics** — contribution trends, work cadence, code reviews, issues, and time-distribution heatmaps for any GitHub user.
- **Compare** — side-by-side analysis of any two repositories using the same metrics. Compare React and Vue, or CockroachDB and TiDB, with one URL.
- **Collections** — 100+ curated lists ranking repos in technology domains (AI agents, databases, web frameworks, MCP servers, and more).
- **Trending & Languages** — hottest repos by time period and language, plus language-level rankings.

## Public API

Reposcope ships a free, documented REST API plus an **MCP-compatible endpoint** for AI agents. List collections, fetch rankings, get repo analytics, search, and compare — all over simple GET requests. See the [API documentation](/docs/api) for details.

## How it's built

- **Live data** — GitHub's public REST API, no backend or database required.
- **Demo mode** — if the analytics database is unavailable, the site serves realistic synthetic data so it always runs. Point it at a real analytics store and live data takes over automatically.
- **Stack** — Next.js, React, ECharts, TypeScript, and a pnpm monorepo.
- **Open source** — Apache 2.0, on [GitHub](https://github.com/sps-exe/reposcope). Issues and PRs welcome.
