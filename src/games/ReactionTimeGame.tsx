import { useCallback, useRef } from 'react';
import { ReactionTimeEnv } from '../core/reactionTime';
import { formatScore, TESTS } from '../core/tests';
import GameOverlay from './GameOverlay';
import { useEnv } from './useEnv';
import type { GameProps } from './types';

const META = TESTS['reaction-time'];

export default function ReactionTimeGame({ onComplete }: GameProps) {
  const { obs, act } = useEnv(() => new ReactionTimeEnv());
  const reported = useRef(false);
  // Last time a pointer press was handled — used to swallow the trailing
  // mouseup "click" so one press can never advance the round twice.
  const pointerAt = useRef(0);

  // Measured on press (pointerdown): reaction benchmarks time the press, and
  // mouseup comes ~100ms later (button travel), which inflated every result.
  const press = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // ignore right/middle button
      const at = performance.now();
      pointerAt.current = at;
      act({ type: 'click', at });
    },
    [act],
  );

  // Keyboard activation (Enter/Space) fires a plain click with detail === 0.
  const click = useCallback(
    (e: React.MouseEvent) => {
      if (e.detail > 0 || performance.now() - pointerAt.current < 700) return;
      act({ type: 'click', at: performance.now() });
    },
    [act],
  );

  const finish = () => {
    if (reported.current) return;
    reported.current = true;
    onComplete({ score: obs.score ?? 0, cleared: [] });
  };

  const surfaceClass =
    obs.phase === 'green'
      ? 'rt-surface rt-green'
      : obs.phase === 'waiting'
        ? 'rt-surface rt-waiting'
        : obs.phase === 'early'
          ? 'rt-surface rt-early'
          : 'rt-surface rt-idle';

  let hint = 'Click to start';
  if (obs.phase === 'waiting') hint = 'Wait for green…';
  else if (obs.phase === 'green') hint = 'Click!';
  else if (obs.phase === 'early') hint = 'Too early — click to retry';
  else if (obs.phase === 'result') hint = `${obs.lastTime} ms — click to continue`;

  return (
    <div className="game game-reaction-time">
      <div className="game-status">
        Round {Math.min(obs.round, obs.totalRounds)} / {obs.totalRounds}
        {obs.times.length > 0 && (
          <span className="muted"> · {obs.times.map((t) => `${Math.round(t)} ms`).join(' · ')}</span>
        )}
      </div>
      <button
        className={surfaceClass}
        onPointerDown={press}
        onClick={click}
        aria-label={hint}
      >
        <span className="rt-hint">{hint}</span>
        {(obs.phase === 'green' || obs.phase === 'waiting') && (
          <span className="rt-clock">{Math.round(obs.elapsed)} ms</span>
        )}
      </button>

      {obs.phase === 'done' && obs.score !== null && (
        <GameOverlay
          accent="neutral"
          title="Run complete"
          message={
            <>
              Average reaction time: <strong>{formatScore(META, obs.score)}</strong>
              <br />
              <span className="muted">{obs.times.map((t) => `${Math.round(t)} ms`).join(' · ')}</span>
            </>
          }
          onContinue={finish}
        />
      )}
    </div>
  );
}
