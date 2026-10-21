import { useCallback, useEffect, useRef, useState } from 'react';
import { SequenceMemoryEnv } from '../core/sequenceMemory';
import GameOverlay from './GameOverlay';
import { useEnv } from './useEnv';
import type { GameProps } from './types';

export default function SequenceMemoryGame({ onComplete }: GameProps) {
  const { obs, act } = useEnv(() => new SequenceMemoryEnv());
  const reported = useRef(false);

  // Press feedback (Human Benchmark style): the tile lights the moment it is
  // pressed and fades back after release.
  const [pressed, setPressed] = useState(-1);
  const flashTimer = useRef<number | undefined>(undefined);

  // Never keep a press highlight outside the input phase (e.g. on game over).
  useEffect(() => {
    if (obs.phase !== 'input') setPressed(-1);
  }, [obs.phase]);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  // Sequence completed → the box washes white for an instant.
  const prevLevel = useRef(obs.level);
  const [levelFlash, setLevelFlash] = useState(false);
  useEffect(() => {
    if (obs.level <= prevLevel.current) return;
    prevLevel.current = obs.level;
    setLevelFlash(true);
    const t = window.setTimeout(() => setLevelFlash(false), 320);
    return () => window.clearTimeout(t);
  }, [obs.level]);

  const press = useCallback((tile: number) => act({ type: 'press', tile }), [act]);
  const finish = () => {
    if (reported.current) return;
    reported.current = true;
    onComplete({ score: obs.score ?? 0, cleared: [] });
  };

  const isShowing = obs.phase === 'show';
  const activeTile = isShowing && obs.showActive ? obs.sequence[obs.showIndex] : -1;

  return (
    <div className={`game game-sequence${levelFlash ? ' level-flash' : ''}`}>
      <div className="game-status">
        {isShowing ? 'Watch carefully…' : obs.phase === 'input' ? 'Your turn' : ''}
        <span className="muted"> · Level {obs.level}</span>
      </div>

      <div className="seq-grid" role="grid" aria-label="Sequence grid">
        {Array.from({ length: 9 }, (_, tile) => {
          const lit = tile === activeTile;
          const pressedNow = tile === pressed;
          return (
            <button
              key={tile}
              className={`seq-tile${lit ? ' lit' : ''}${pressedNow ? ' pressed' : ''}`}
              onPointerDown={() => {
                if (obs.phase === 'input') setPressed(tile);
              }}
              onPointerUp={() => setPressed((p) => (p === tile ? -1 : p))}
              onPointerLeave={() => setPressed((p) => (p === tile ? -1 : p))}
              onPointerCancel={() => setPressed((p) => (p === tile ? -1 : p))}
              onClick={(e) => {
                press(tile);
                // Keyboard activation (Enter/Space) has no press/release — flash briefly.
                if (e.detail === 0) {
                  setPressed(tile);
                  window.clearTimeout(flashTimer.current);
                  flashTimer.current = window.setTimeout(() => setPressed(-1), 200);
                }
              }}
              disabled={obs.phase !== 'input'}
              aria-label={`Tile ${tile + 1}`}
            />
          );
        })}
      </div>

      <div className="seq-progress" aria-hidden="true">
        {obs.phase === 'input' &&
          Array.from({ length: obs.sequence.length }, (_, i) => (
            <span key={i} className={`seq-dot${i < obs.inputIndex ? ' done' : ''}`} />
          ))}
      </div>

      {obs.phase === 'done' && (
        <GameOverlay
          accent="bad"
          title={`You reached level ${obs.score ?? 0}`}
          message={
            <>
              Sequence length: <strong>{obs.score ?? 0}</strong> tiles
            </>
          }
          onContinue={finish}
        />
      )}
    </div>
  );
}
