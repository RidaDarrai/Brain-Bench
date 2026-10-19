import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatScore, isTestId, TESTS } from '../core/tests';
import AimTrainerGame from '../games/AimTrainerGame';
import ChimpTestGame from '../games/ChimpTestGame';
import NumberMemoryGame from '../games/NumberMemoryGame';
import ReactionTimeGame from '../games/ReactionTimeGame';
import SequenceMemoryGame from '../games/SequenceMemoryGame';
import VisualMemoryGame from '../games/VisualMemoryGame';
import type { GameComponent, GameResult } from '../games/types';
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
      <div className="test-intro">
        <Link to="/" className="back-link">
          ← All tests
        </Link>
        <div className="test-intro-head">
          <span className="test-intro-icon" aria-hidden="true">
            {meta.icon}
          </span>
          <div>
            <h1>{meta.name}</h1>
            <p className="lead">{meta.description}</p>
          </div>
        </div>

        <div className="test-intro-stats">
          <span className="pill">
            Best: <strong>{formatScore(meta, saved?.bestScore ?? null)}</strong>
          </span>
          {meta.hasLevels && (
            <span className="pill pill-levels">
              Highest unlocked: <strong>Level {unlocked}</strong> / {meta.maxLevel}
            </span>
          )}
        </div>

        <ol className="instructions">
          {meta.instructions.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>

        {meta.hasLevels && (
          <div className="level-picker">
            <label htmlFor="level-select">Start at level</label>
            <select
              id="level-select"
              value={Math.min(Math.max(startLevel, meta.defaultStartLevel), unlocked)}
              onChange={(e) => setStartLevel(Number(e.target.value))}
            >
              {levelOptions.map((lvl) => (
                <option key={lvl} value={lvl} disabled={lvl > unlocked}>
                  Level {lvl}
                  {lvl > unlocked ? ' (locked)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <button className="btn btn-primary btn-lg" onClick={() => begin(startLevel)}>
          Start test
        </button>
      </div>
    );
  }

  // ---------- PLAYING ----------
  if (status === 'playing') {
    return (
      <div className="test-playing">
        <div className="playing-bar">
          <Link to="/" className="back-link">
            ← Exit
          </Link>
          <span className="playing-title">
            {meta.icon} {meta.name}
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
  // "Next level" resumes at the first level NOT yet passed: for memory games
  // that's the level the player just failed (score = levels passed); for Aim
  // Trainer (score in ms) it's simply the level after the one just passed.
  const nextLevel = meta.lowerIsBetter ? attempt.level + 1 : (result?.score ?? 0) + 1;
  const canGoNext =
    meta.hasLevels && result && startLevelPassed && nextLevel <= maxLevel;

  return (
    <div className="test-results">
      <div className="results-card">
        <span className="results-icon" aria-hidden="true">
          {meta.icon}
        </span>
        <h1>{meta.name}</h1>

        <div className="results-score">
          <span className="results-score-value">{formatScore(meta, result?.score ?? 0)}</span>
          {result?.newBest && <span className="badge badge-best">★ New best!</span>}
        </div>

        {!meta.lowerIsBetter && result && result.score > 0 && (
          <p className="muted">
            {meta.hasLevels ? (
              <>
                You passed {result.score} {result.score === 1 ? 'level' : 'levels'}
              </>
            ) : (
              <>You reached level {result.score}</>
            )}
          </p>
        )}

        {newLevelUnlocked && (
          <p className="badge badge-unlock">
            🔓 Level {result!.newlyUnlocked.join(' & ')} unlocked!
          </p>
        )}
        {meta.hasLevels && !newLevelUnlocked && startLevelPassed && (
          <p className="muted">Level {attempt.level} passed — keep climbing!</p>
        )}

        <div className="results-best muted">
          Personal best: <strong>{formatScore(meta, saved?.bestScore ?? null)}</strong>
        </div>

        <div className="results-actions">
          <button className="btn btn-primary" onClick={() => begin(attempt.level)}>
            Retry
          </button>
          {canGoNext && (
            <button className="btn" onClick={() => begin(nextLevel)}>
              Next level →
            </button>
          )}
          <button className="btn" onClick={() => setStatus('intro')}>
            {meta.hasLevels ? 'Change level' : 'Back to info'}
          </button>
          <Link className="btn" to="/">
            All tests
          </Link>
          <Link className="btn" to="/progress">
            Progress
          </Link>
        </div>
      </div>
    </div>
  );
}
