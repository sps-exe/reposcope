'use client';

import React, { useEffect, useState } from 'react';
import type { ReposcopeScore } from '@/lib/reposcope-score';

/**
 * Reposcope Score card — the hero metric for any repository page.
 *
 * Fetches /api/score/:owner/:repo (live from GitHub's public API, no DB
 * needed). Renders a radial gauge, the five weighted dimensions, and an
 * expandable explainer of how the score is computed. Degrades to nothing
 * if the score API is unavailable, so it never breaks the page.
 */

interface ScoreResponse extends ReposcopeScore {
  owner: string;
  repo: string;
}

interface ReposcopeScoreCardProps {
  owner: string;
  repo: string;
}

const DIMENSION_LABELS: Record<keyof ReposcopeScore['dimensions'], string> = {
  popularity: 'Popularity',
  velocity: 'Velocity',
  maintenance: 'Maintenance',
  community: 'Community',
  longevity: 'Longevity',
};

const DIMENSION_HINTS: Record<keyof ReposcopeScore['dimensions'], string> = {
  popularity: 'Stars, forks & watchers',
  velocity: 'Commit activity, last 12 months',
  maintenance: 'How recently it was pushed to',
  community: 'Unique contributors',
  longevity: 'Age of the repository',
};

const GRADE_COLORS: Record<string, string> = {
  Exceptional: '#22d3ee',
  Strong: '#a78bfa',
  Healthy: '#34d399',
  Developing: '#fbbf24',
  Nascent: '#7d8496',
};

const GLOBAL_GRADIENT_ID = 'reposcope-score-gauge';

export default function ReposcopeScoreCard({ owner, repo }: ReposcopeScoreCardProps) {
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');

    fetch(`/api/score/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`score api: ${res.status}`);
        return res.json() as Promise<ScoreResponse>;
      })
      .then((json) => {
        setResult(json);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name === 'AbortError') return;
        setStatus('error');
      });

    return () => controller.abort();
  }, [owner, repo]);

  if (status !== 'ready' || !result) return null;

  const score = result.score;
  const grade = result.grade;
  const gradeColor = GRADE_COLORS[grade] ?? GRADE_COLORS.Nascent;

  const R = 52;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  const dimensions = Object.entries(result.dimensions) as [
    keyof ReposcopeScore['dimensions'],
    { score: number; weight: number },
  ][];

  return (
    <div className="rounded-[6px] border border-[#2a2f42] bg-[#151927] p-5">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* Gauge */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="relative h-[120px] w-[120px]">
            <svg viewBox="0 0 120 120" width={120} height={120}>
              <defs>
                <linearGradient id={GLOBAL_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={R} fill="none" stroke="#23293d" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={`url(#${GLOBAL_GRADIENT_ID})`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={String(CIRCUMFERENCE)}
                strokeDashoffset={String(dashOffset)}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="text-[32px] font-bold leading-none tracking-tight"
                style={{ color: gradeColor }}
              >
                {score}
              </div>
              <div className="mt-1 text-[11px] text-[#8c8c8c]">of 100</div>
            </div>
          </div>
          <div className="max-w-[180px]">
            <div className="text-[13px] font-semibold uppercase tracking-wider text-[#8c8c8c]">
              Reposcope Score
            </div>
            <div className="mt-1 text-lg font-semibold" style={{ color: gradeColor }}>
              {grade}
            </div>
            <div className="mt-1 text-xs leading-5 text-[#7c7c7c]">
              Health & activity of{' '}
              <span className="text-[#e9eaee]">
                {owner}/{repo}
              </span>
              , computed live from GitHub.
            </div>
          </div>
        </div>

        {/* Dimension bars */}
        <div className="min-w-0 flex-1 space-y-3">
          {dimensions.map(([key, dim]) => (
            <div key={key}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] text-[#e9eaee]">{DIMENSION_LABELS[key]}</span>
                  <span className="text-[11px] text-[#7c7c7c]">{DIMENSION_HINTS[key]}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold text-[#e9eaee]">{dim.score}</span>
                  <span className="text-[11px] text-[#7c7c7c]">/ 100 · {dim.weight}%</span>
                </div>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#23293d]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${dim.score}%`,
                    background: 'linear-gradient(90deg, #22d3ee, #a78bfa)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explainer */}
      <div className="mt-4 border-t border-[#23293d] pt-3">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-[12px] text-[#22d3ee] transition-colors hover:text-[#67e8f9]"
        >
          {showDetails ? 'Hide' : 'How is this scored?'}
        </button>
        {showDetails && (
          <p className="mt-2 max-w-3xl text-[12px] leading-6 text-[#8c8c8c]">
            The Reposcope Score is a 0–100 composite of five weighted dimensions, all computed
            from GitHub&apos;s public API: <strong>Popularity</strong> (30%) — log-scaled stars,
            forks and watchers; <strong>Velocity</strong> (30%) — commit activity over the last
            12 months, weighted toward recent weeks; <strong>Maintenance</strong> (20%) — how
            recently the repository was pushed to; <strong>Community</strong> (10%) — the number
            of unique contributors; and <strong>Longevity</strong> (10%) — the age of the
            repository. Data refreshes hourly; no database is required.
          </p>
        )}
      </div>
    </div>
  );
}
