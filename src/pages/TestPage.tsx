import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LockOpen, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatScore, isTestId, TESTS } from '../core/tests';
import { testAccentStyle } from '../lib/test-theme';
import AimTrainerGame from '../games/AimTrainerGame';
import ChimpTestGame from '../games/ChimpTestGame';
import NumberMemoryGame from '../games/NumberMemoryGame';
import ReactionTimeGame from '../games/ReactionTimeGame';
import SequenceMemoryGame from '../games/SequenceMemoryGame';
import VisualMemoryGame from '../games/VisualMemoryGame';
import type { GameComponent, GameResult } from '../games/types';
import TestIcon from '../components/TestIcon';
import CountUp from '../components/CountUp';
import { loadProgress, recordRun, type RunOutcome } from '../storage/progress';

type Status = 'intro' | 'playing' | 'results';

interface AttemptKey {
  level: number;
  n: number;
}

export default function TestPage() {
  const { testId } = useParams<{ testId: string }>();

  const meta = isTestId(testId ?? '') ? TESTS[testId as keyof typeof TESTS] : null;

  const [progress, setProgress] = useState(() => loadProgress());
  const [status, setStatus] = useState<Status>('intro');
  const [startLevel, setStartLevel] = useState(1);
  const [attempt, setAttempt] = useState<AttemptKey>({ level: 1, n: 0 });
  const [result, setResult] = useState<(GameResult & RunOutcome) | null>(null);

  const saved = meta ? progress.tests[meta.id] : undefined;

  // Pick the default starting level once we know the saved progress.
  useEffect(() => {
    if (meta) {
      setStartLevel(saved?.highestUnlockedLevel ?? meta.defaultStartLevel);
    }
    // Intentionally keyed on the test id only: re-entering a test resets the
    // default start level, but changing it later shouldn't override the picker.
  }, [meta?.id]);

  const Game: GameComponent | null = useMemo(() => {
    if (!meta) return null;
    switch (meta.id) {
      case 'reaction-time':
        return ReactionTimeGame;
      case 'sequence-memory':
        return SequenceMemoryGame;
      case 'number-memory':
        return NumberMemoryGame;
      case 'visual-memory':
        return VisualMemoryGame;
      case 'chimp-test':
        return ChimpTestGame;
      case 'aim-trainer':
        return AimTrainerGame;
    }
    return null;
  }, [meta]);

  const begin = useCallback(
    (level: number) => {
      setStartLevel(level);
      setAttempt((a) => ({ level, n: a.n + 1 }));
      setResult(null);
      setStatus('playing');
    },
    [],
  );

  const onComplete = useCallback(
    (r: GameResult) => {
      if (!meta) return;
      const outcome = recordRun(meta.id, r.score, r.cleared, { updateBest: r.validForBest !== false });
      setProgress(outcome.progress);
      setResult({ ...r, ...outcome });
      setStatus('results');
    },
    [meta],
  );

  if (!meta || !Game) {
    return (
      <div className="centered-page">
        <h1>Unknown test</h1>
        <Link className="btn btn-primary" to="/">
          Back to tests
        </Link>
      </div>
    );
  }

  const unlocked = saved?.highestUnlockedLevel ?? meta.defaultStartLevel;
  const maxLevel = Math.max(meta.maxLevel, meta.defaultStartLevel);
  const startLevelPassed = result ? result.cleared.includes(attempt.level) : false;

  // ---------- INTRO ----------
  if (status === 'intro') {
    const levelOptions = meta.hasLevels
      ? Array.from({ length: maxLevel - meta.defaultStartLevel + 1 }, (_, i) => i + meta.defaultStartLevel)
      : [];

    return (
      <div className="mx-auto max-w-2xl" style={testAccentStyle(meta.id)}>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4 text-muted-foreground">
          <Link to="/">
            <ArrowLeft className="size-4" /> All tests
          </Link>
        </Button>
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-[var(--test-accent)]/30 bg-[var(--test-accent)]/10 text-[var(--test-accent)]">
            <TestIcon id={meta.id} className="size-7" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{meta.name}</h1>
            <p className="mt-1 text-base leading-relaxed text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 font-mono text-xs tracking-wide text-muted-foreground">
            Best{' '}
            <b className="font-medium text-foreground">
              {formatScore(meta, saved?.bestScore ?? null)}
            </b>
          </span>
          {meta.hasLevels && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--test-accent)]/25 bg-[var(--test-accent)]/[0.07] px-3 py-1 font-mono text-xs tracking-wide text-muted-foreground">
              Highest unlocked{' '}
              <b className="font-medium text-[var(--test-accent)]">
                Lvl {unlocked}/{meta.maxLevel}
              </b>
            </span>
          )}
        </div>

        <ol className="mt-6 list-none space-y-2.5 p-0">
          {meta.instructions.map((line, i) => (
            <li key={i} className="flex gap-3 text-base text-muted-foreground">
              <span className="mt-px font-mono text-xs text-[var(--brand)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              {line}
            </li>
          ))}
        </ol>

        {meta.hasLevels && (
          <div className="mt-6">
            <label
              htmlFor="level-select"
              className="mb-2 block font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase"
            >
              Start at level
            </label>
            <Select
              value={String(Math.min(Math.max(startLevel, meta.defaultStartLevel), unlocked))}
              onValueChange={(v) => setStartLevel(Number(v))}
            >
              <SelectTrigger id="level-select" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map((lvl) => (
                  <SelectItem key={lvl} value={String(lvl)} disabled={lvl > unlocked}>
                    Level {lvl}
                    {lvl > unlocked ? ' (locked)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button size="lg" className="mt-6" onClick={() => begin(startLevel)}>
          <Play className="size-4" /> Start test
        </Button>
      </div>
    );
  }

  // ---------- PLAYING ----------
  if (status === 'playing') {
    return (
      <div className="test-playing">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/">
              <ArrowLeft className="size-4" /> Exit
            </Link>
          </Button>
          <span
            style={testAccentStyle(meta.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs tracking-wide text-muted-foreground"
          >
            <TestIcon id={meta.id} className="size-3.5 text-[var(--test-accent)]" />
            {meta.name}
            {meta.hasLevels && <> · Level {startLevel}</>}
          </span>
        </div>
        <Game
          key={`${meta.id}-${attempt.level}-${attempt.n}`}
          startLevel={attempt.level}
          onComplete={onComplete}
        />
      </div>
    );
  }

  // ---------- RESULTS ----------
  const newLevelUnlocked = result && result.newlyUnlocked.length > 0;
  // "Next level" resumes at the first level NOT yet passed: deepest cleared
  // level + 1 (levels come from the cleared list because Chimp's score is a
  // digit count, not a level tally); for Aim Trainer (score in ms) it's
  // simply the level after the one just passed.
  const clearedLevels = result?.cleared ?? [];
  const nextLevel = meta.lowerIsBetter
    ? attempt.level + 1
    : clearedLevels.length > 0
      ? Math.max(...clearedLevels) + 1
      : (result?.score ?? 0) + 1;
  const canGoNext =
    meta.hasLevels && result && startLevelPassed && nextLevel <= maxLevel;

  return (
    <div style={testAccentStyle(meta.id)} className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-[var(--test-accent)]/30 bg-[var(--test-accent)]/10 text-[var(--test-accent)]">
          <TestIcon id={meta.id} className="size-6" />
        </span>
        <h1 className="mt-4 mb-0 text-3xl font-bold tracking-tight">{meta.name}</h1>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="hud-num glow-text text-4xl font-bold sm:text-5xl">
            <CountUp value={result?.score ?? 0} format={(n) => formatScore(meta, n)} />
          </span>
          {result?.newBest && (
            <span
              className="glitch inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/40 bg-[var(--success)]/10 px-3 py-1 font-mono text-xs font-semibold tracking-wide uppercase text-[var(--success)]"
              data-text="New best!"
            >
              <Sparkles className="size-3.5" aria-hidden="true" /> New best!
            </span>
          )}
        </div>

        {!meta.lowerIsBetter && result && result.score > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {meta.hasLevels ? (
              <>
                You passed {clearedLevels.length}{' '}
                {clearedLevels.length === 1 ? 'level' : 'levels'}
              </>
            ) : (
              <>You reached level {result.score}</>
            )}
          </p>
        )}

        {newLevelUnlocked && (
          <p
            style={testAccentStyle(meta.id)}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--test-accent)]/30 bg-[var(--test-accent)]/[0.08] px-3 py-1 font-mono text-xs tracking-wide text-[var(--test-accent)]"
          >
            <LockOpen className="size-3.5" aria-hidden="true" />
            Level {result!.newlyUnlocked.join(' & ')} unlocked!
          </p>
        )}
        {meta.hasLevels && !newLevelUnlocked && startLevelPassed && (
          <p className="mt-2 text-sm text-muted-foreground">
            Level {attempt.level} passed — keep climbing!
          </p>
        )}

        <div className="mt-4 font-mono text-xs tracking-wide text-muted-foreground">
          Personal best:{' '}
          <strong className="font-medium text-foreground">
            {formatScore(meta, saved?.bestScore ?? null)}
          </strong>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => begin(attempt.level)}>
            <RotateCcw className="size-4" /> Retry
          </Button>
          {canGoNext && (
            <Button variant="outline" onClick={() => begin(nextLevel)}>
              Next level <ArrowRight className="size-4" />
            </Button>
          )}
          <Button variant="outline" onClick={() => setStatus('intro')}>
            {meta.hasLevels ? 'Change level' : 'Back to info'}
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/">All tests</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/progress">Progress</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
