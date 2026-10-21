import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-12">
      {/* ---------- Hero (full-bleed, benchmark-scale) ---------- */}
      <section className="relative -mt-8 left-1/2 w-screen -translate-x-1/2 overflow-hidden border-b border-border bg-card px-6 py-20 text-center sm:py-24">
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
        <div className="relative mx-auto flex max-w-2xl flex-col items-center">
          <Zap
            aria-hidden="true"
            className="size-20 text-[var(--brand)] drop-shadow-[0_0_32px_var(--glow)] sm:size-24"
          />
          <h1
            className="glitch mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            data-text="Brain Bench"
          >
            Brain Bench
          </h1>
          <p className="mt-5 text-lg text-muted-foreground sm:text-xl">
            Measure your abilities with cognitive tests.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 px-8 text-base shadow-[0_0_28px_var(--glow)]"
          >
            <a href="#tests">Get started</a>
          </Button>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
            <span>
              Tests{' '}
              <b className="ml-1 font-medium text-foreground">
                {String(TEST_ORDER.length).padStart(2, '0')}
              </b>
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

      {/* ---------- Test grid (below the fold — scroll to reach) ---------- */}
      <section
        id="tests"
        aria-label="Tests"
        className="grid scroll-mt-24 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {TEST_ORDER.map((id, i) => {
          const meta = TESTS[id];
          const saved = progress.tests[id];
          return (
            <Link
              key={id}
              to={`/test/${id}`}
              style={{ ...testAccentStyle(id), animationDelay: `${i * 60}ms` }}
              className="card-enter group relative flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-8 text-center text-foreground transition-all duration-200 hover:-translate-y-1 hover:border-[var(--test-accent)]/60 hover:shadow-[0_16px_40px_-16px_var(--test-accent)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span
                aria-hidden="true"
                className="flex size-16 items-center justify-center rounded-2xl border border-[var(--test-accent)]/30 bg-[var(--test-accent)]/10 text-[var(--test-accent)] transition-shadow duration-200 group-hover:shadow-[0_0_28px_var(--test-accent)]/40"
              >
                <TestIcon id={id} className="size-8" />
              </span>
              <h2 className="mt-5 text-xl font-bold tracking-tight">{meta.name}</h2>
              <p className="mt-1.5 text-base leading-snug text-muted-foreground">
                {meta.tagline}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 font-mono text-xs tracking-wide text-muted-foreground">
                  Best{' '}
                  <b className="font-medium text-foreground">
                    {formatScore(meta, saved?.bestScore ?? null)}
                  </b>
                </span>
                {meta.hasLevels ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--test-accent)]/25 bg-[var(--test-accent)]/[0.07] px-3 py-1 font-mono text-xs tracking-wide text-muted-foreground">
                    Lvl{' '}
                    <b className="font-medium text-[var(--test-accent)]">
                      {saved?.highestUnlockedLevel ?? meta.defaultStartLevel}/{meta.maxLevel}
                    </b>
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-border px-3 py-1 font-mono text-xs tracking-wide text-muted-foreground">
                    Continuous run
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
