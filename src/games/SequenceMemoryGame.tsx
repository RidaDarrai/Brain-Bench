import { useCallback, useRef } from 'react';
import { SequenceMemoryEnv } from '../core/sequenceMemory';
import GameOverlay from './GameOverlay';
import { useEnv } from './useEnv';
import type { GameProps } from './types';

export default function SequenceMemoryGame({ onComplete }: GameProps) {
  const { obs, act } = useEnv(() => new SequenceMemoryEnv());
  const reported = useRef(false);

  const press = useCallback((tile: number) => act({ type: 'press', tile }), [act]);
  const finish = () => {
    if (reported.current) return;
    reported.current = true;
    onComplete({ score: obs.score ?? 0, cleared: [] });
  };

  const isShowing = obs.phase === 'show';
  const activeTile = isShowing && obs.showActive ? obs.sequence[obs.showIndex] : -1;

  return (
    <div className="game game-sequence">
      <div className="game-status">
        {isShowing ? 'Watch carefully…' : obs.phase === 'input' ? 'Your turn' : ''}
        <span className="muted"> · Level {obs.level}</span>
      </div>

      <div className="seq-grid" role="grid" aria-label="Sequence grid">
        {Array.from({ length: 9 }, (_, tile) => {
          const lit = tile === activeTile;
          const pressed = obs.phase === 'input' && lit;
          return (
            <button
              key={tile}
              className={`seq-tile${lit ? ' lit' : ''}${pressed ? ' pressed' : ''}`}
              onClick={() => press(tile)}
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
