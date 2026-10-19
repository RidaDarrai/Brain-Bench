import { useCallback, useRef } from 'react';
import { ReactionTimeEnv } from '../core/reactionTime';
import { formatScore, TESTS } from '../core/tests';
import GameOverlay from './GameOverlay';
import { useEnv } from './useEnv';
import type { GameProps } from './types';

const META = TESTS['reaction-time'];

export default function ReactionTimeGame({ onComplete }: GameProps) {
  const { obs, act } = useEnv(() => new ReactionTimeEnv());
  const click = useCallback(() => act({ type: 'click' }), [act]);
  const reported = useRef(false);

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
      <button className={surfaceClass} onClick={click} aria-label={hint}>
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
