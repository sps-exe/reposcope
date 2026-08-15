import Link from 'next/link';
import { ArrowLeft, BarChart3, Clock3, Wrench } from 'lucide-react';

export function ExploreMaintenance() {
  return (
    <main className="min-h-[calc(100vh-var(--site-header-height))] bg-[#0b0e14] text-white">
      <section className="mx-auto flex min-h-[calc(100vh-var(--site-header-height))] w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="max-w-2xl">
          <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-[#151927] text-[#22d3ee]">
            <Wrench className="h-6 w-6" aria-hidden="true" />
          </div>

          <p className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-[#22d3ee]">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            Under maintenance
          </p>

          <h1 className="text-4xl font-semibold leading-tight text-[#f4f5f7] sm:text-5xl">
            Data Explorer is getting an upgrade
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#c9cedb]">
            The natural-language Data Explorer is temporarily offline while we
            rebuild it. Repo analytics, Collections, and Trending are all still
            fully available.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 bg-[#22d3ee] px-5 text-sm font-semibold text-[#04121a] transition hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Reposcope
            </Link>
            <Link
              href="/trending"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 bg-transparent px-5 text-sm font-semibold text-[#e8ebf2] transition hover:bg-white/5"
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Browse Trending
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
