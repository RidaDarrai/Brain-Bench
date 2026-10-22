import { useCallback, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { LIVES, VisualMemoryEnv } from '../core/visualMemory';
import { pitchRatio, playSound } from '../sound';
import GameOverlay from './GameOverlay';
import { levelsBetween, useEnv } from './useEnv';
import type { GameProps } from './types';

export default function VisualMemoryGame({ startLevel, onComplete }: GameProps) {
  const { obs, act } = useEnv(() => new VisualMemoryEnv(startLevel));
  const reported = useRef(false);

  // Human Benchmark sounds: reveal when the tiles flash, "go" on your turn,
  // victory on a cleared level, low boop when a life is lost.
  useEffect(() => {
    if (obs.phase === 'reveal') playSound('reveal', { volume: 0.2 });
    else if (obs.phase === 'input') playSound('go', { volume: 0.2 });
    else if (obs.phase === 'recap') {
      if (obs.lastCorrect) playSound('victory', { volume: 0.25 });
      else playSound('boop', { pitch: pitchRatio(-4), volume: 0.25 });
    }
  }, [obs.phase, obs.lastCorrect]);

  const finish = useCallback(
    (cleared: number[]) => {
      if (reported.current) return;
      reported.current = true;
      onComplete({ score: obs.score ?? 0, cleared });
    },
    [obs.score, onComplete],
  );
  const cleared = levelsBetween(startLevel, obs.score ?? 0);

  // Picks lock in (HB: no undo, no submit — the level auto-completes when the
  // board exactly matches). Clicks are on pointerdown for instant response.
  const pick = (cell: number) => {
    if (obs.phase !== 'input' || obs.picked.includes(cell)) return;
    // HB boops: pitch rises with each correct pick; wrong picks get a low one.
    if (obs.tiles.includes(cell)) {
      const correctSoFar = obs.picked.filter((c) => obs.tiles.includes(c)).length + 1;
      playSound('boop', { pitch: pitchRatio(correctSoFar - 1), volume: 0.2 });
    } else {
      playSound('boop', { pitch: pitchRatio(-3), volume: 0.2 });
    }
    act({ type: 'pick', cell });
  };

  const isRevealing = obs.phase === 'reveal';
  const flashing = obs.phase === 'recap';
  // During a lost-level recap, HB dims the heart being lost right away.
  const losing = !obs.lastCorrect && (obs.phase === 'recap' || obs.phase === 'postrecap');
  const displayLives = obs.lives - (losing ? 1 : 0);

  return (
    <div
      className={`game game-visual${flashing ? (obs.lastCorrect ? ' recap-flash' : ' recap-flash loss') : ''}`}
    >
      <div className="game-status">
        <span className="muted">
          {isRevealing ? 'Watch carefully… · ' : obs.phase === 'input' ? 'Your turn · ' : ''}
          Level {obs.level}
        </span>
        <span className="vis-hearts" aria-label={`${displayLives} of ${LIVES} lives`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <Heart
              key={i}
              className={`vis-heart${i < displayLives ? ' on' : ''}`}
              aria-hidden="true"
            />
          ))}
        </span>
      </div>

      <div
        className="vis-grid"
        style={{ '--vis-cols': obs.gridSize } as React.CSSProperties}
        role="grid"
        aria-label="Memory grid"
      >
        {Array.from({ length: obs.gridSize * obs.gridSize }, (_, cell) => {
          const isTile = obs.tiles.includes(cell);
          const lit = isRevealing && isTile;
          const pickedNow = obs.picked.includes(cell);
          const wrong = pickedNow && !isTile;
          return (
            <button
              key={cell}
              className={`vis-cell${lit ? ' lit' : ''}${pickedNow && isTile ? ' selected flip' : ''}${
                wrong ? ' wrong' : ''
              }`}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                pick(cell);
              }}
              // Keyboard activation (Enter/Space) has no pointerdown.
              onClick={(e) => {
                if (e.detail === 0) pick(cell);
              }}
              disabled={obs.phase !== 'input'}
              aria-label={`Cell ${cell + 1}`}
            />
          );
        })}
      </div>

      {obs.phase === 'gameover' && (
        <GameOverlay
          accent="bad"
          title="Out of lives"
          message={
            <>
              You reached level {obs.level} and passed{' '}
              <strong>
                {obs.score ?? 0} {obs.score === 1 ? 'level' : 'levels'}
              </strong>
              .
            </>
          }
          onContinue={() => finish(cleared)}
        />
      )}
    </div>
  );
}
