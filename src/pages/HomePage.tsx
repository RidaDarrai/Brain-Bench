import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatScore, TESTS, TEST_ORDER } from '../core/tests';
import { loadProgress } from '../storage/progress';
import { testAccentStyle } from '../lib/test-theme';
import TestIcon from '../components/TestIcon';

export default function HomePage() {
  const progress = loadProgress();
  const scoredCount = TEST_ORDER.filter(
    (id) => progress.tests[id]?.bestScore != null,
  ).length;

  return (
    <div className="space-y-10">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 text-center sm:py-14">
        {/* faint instrument grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 75%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 75%)',
          }}
        />
        <div className="relative">
          <p className="font-mono text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
            Cognitive suite <span className="text-[var(--brand)]">//</span> runs local
          </p>
          <h1
            className="glitch mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            data-text="Measure your abilities with cognitive tests."
          >
            Measure your abilities with cognitive tests.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Six quick tests for reaction speed, memory, and aim. Progress is saved in your browser —
            no account needed.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            <span>
              Tests{' '}
              <b className="ml-1 font-medium text-foreground">{String(TEST_ORDER.length).padStart(2, '0')}</b>
            </span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span>
              Scored{' '}
              <b className="ml-1 font-medium text-[var(--brand)]">
                {scoredCount}/{TEST_ORDER.length}
              </b>
            </span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span>
              Storage{' '}
              <b className="ml-1 font-medium text-[var(--success)]">Local</b>
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Test grid ---------- */}
      <section aria-label="Tests" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEST_ORDER.map((id, i) => {
          const meta = TESTS[id];
          const saved = progress.tests[id];
          return (
            <Link
              key={id}
              to={`/test/${id}`}
              style={{ ...testAccentStyle(id), animationDelay: `${i * 60}ms` }}
              className="card-enter group relative flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--test-accent)]/60 hover:shadow-[0_12px_32px_-16px_var(--test-accent)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--test-accent)]/30 bg-[var(--test-accent)]/10 text-[var(--test-accent)] transition-shadow duration-200 group-hover:shadow-[0_0_20px_var(--test-accent)]/40"
              >
                <TestIcon id={id} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold tracking-tight">{meta.name}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="ml-auto size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                  {meta.tagline}
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 font-mono text-[11px] tracking-wide text-muted-foreground">
                    Best{' '}
                    <b className="font-medium text-foreground">
                      {formatScore(meta, saved?.bestScore ?? null)}
                    </b>
                  </span>
                  {meta.hasLevels ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--test-accent)]/25 bg-[var(--test-accent)]/[0.07] px-2.5 py-0.5 font-mono text-[11px] tracking-wide text-muted-foreground">
                      Lvl{' '}
                      <b className="font-medium text-[var(--test-accent)]">
                        {saved?.highestUnlockedLevel ?? meta.defaultStartLevel}/{meta.maxLevel}
                      </b>
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] tracking-wide text-muted-foreground">
                      Continuous run
                    </span>
                  )}
                </span>
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
