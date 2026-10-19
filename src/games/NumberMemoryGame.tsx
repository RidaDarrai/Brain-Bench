import { useCallback, useEffect, useRef, useState } from 'react';
import { NumberMemoryEnv } from '../core/numberMemory';
import GameOverlay from './GameOverlay';
import { levelsBetween, useEnv } from './useEnv';
import type { GameProps } from './types';

export default function NumberMemoryGame({ startLevel, onComplete }: GameProps) {
  const { obs, act } = useEnv(() => new NumberMemoryEnv(startLevel));
  const [typed, setTyped] = useState('');
  const reported = useRef(false);

  const finish = useCallback(
    (cleared: number[]) => {
      if (reported.current) return;
      reported.current = true;
      onComplete({ score: obs.score ?? 0, cleared });
    },
    [obs.score, onComplete],
  );

  // A run that ends (wrong answer) clears the levels from the run's start
  // level up to the final score (= level - 1).
  const cleared = levelsBetween(startLevel, obs.score ?? 0);

  useEffect(() => {
    if (obs.phase === 'feedback' && obs.correct === true) setTyped('');
  }, [obs.phase, obs.correct]);

  const submit = useCallback(() => {
    act({ type: 'submit' });
    setTyped('');
  }, [act]);

  const onChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, obs.number.length);
    setTyped(digits);
    act({ type: 'input', value: digits });
  };

  return (
    <div className="game game-number">
      <div className="game-status">
        <span className="muted">Level {obs.level}</span>
      </div>

      {obs.phase === 'show' && (
        <div className="num-show">
          <div className="num-value">{obs.number}</div>
          <div className="num-timer" aria-hidden="true">
            <div
              className="num-timer-fill"
              style={{
                width: `${Math.min(100, (obs.showRemaining / (900 + 450 * obs.level)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {obs.phase === 'input' && (
        <div className="num-input-area">
          <input
            className="num-input"
            value={typed}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            inputMode="numeric"
            autoFocus
            aria-label="Type the number"
            placeholder="Type it…"
          />
          <div className="num-actions">
            {typed.length > 0 && (
              <button className="btn btn-primary" onClick={submit}>
                Submit
              </button>
            )}
            <span className="muted">Press Enter to submit</span>
          </div>
        </div>
      )}

      {obs.phase === 'feedback' && (
        <div className="num-show">
          <div className="num-value num-correct">✓ {obs.number}</div>
          <p className="muted">Correct! Get ready for level {obs.level + 1}…</p>
          <button className="btn btn-primary" onClick={() => act({ type: 'continue' })} autoFocus>
            Next level
          </button>
        </div>
      )}

      {obs.phase === 'done' && (
        <GameOverlay
          accent="bad"
          title="Wrong answer"
          message={
            <>
              The number was <strong className="num-value-inline">{obs.number}</strong>
              <br />
              You passed {obs.score ?? 0} {obs.score === 1 ? 'level' : 'levels'}
            </>
          }
          onContinue={() => finish(cleared)}
        />
      )}
    </div>
  );
}
