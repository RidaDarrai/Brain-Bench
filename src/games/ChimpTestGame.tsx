import { useCallback, useRef } from 'react';
import { ChimpTestEnv } from '../core/chimpTest';
import GameOverlay from './GameOverlay';
import { levelsBetween, useEnv } from './useEnv';
import type { GameProps } from './types';

const MIN_CHIMP_LEVEL = 4;

export default function ChimpTestGame({ startLevel, onComplete }: GameProps) {
  const initial = Math.max(MIN_CHIMP_LEVEL, startLevel);
  const { obs, act } = useEnv(() => new ChimpTestEnv(initial));
  const reported = useRef(false);

  const finish = useCallback(
    (cleared: number[]) => {
      if (reported.current) return;
      reported.current = true;
      onComplete({ score: obs.score ?? 0, cleared });
    },
    [obs.score, onComplete],
  );
  // A failing run clears the levels from the run's start up to score (= level - 1).
  const cleared = levelsBetween(initial, obs.score ?? 0);

  const select = (cell: number) => act({ type: 'select', cell });

  const cellValue = (cell: number): number | undefined =>
    obs.cards.find((c) => c.cell === cell)?.value;

  const isShowing = obs.phase === 'show';

  return (
    <div className="game game-chimp">
      <div className="game-status">
        <span className="muted">
          Level {obs.level} — find {obs.numbersVisible ? '1 first' : obs.expected}
        </span>
      </div>

      <div
        className="chimp-grid"
        style={{ gridTemplateColumns: `repeat(${obs.cols}, 1fr)` }}
        role="grid"
        aria-label="Chimp grid"
      >
        {Array.from({ length: obs.cols * obs.rows }, (_, cell) => {
          const value = cellValue(cell);
          const occupied = value !== undefined;
          const visible = occupied && obs.numbersVisible;
          const missed = !isShowing && occupied && value < obs.expected;
          return (
            <button
              key={cell}
              className={`chimp-cell${occupied ? ' occupied' : ''}${visible ? ' with-number' : ''}${
                missed ? ' missed' : ''
              }`}
              onClick={() => select(cell)}
              disabled={obs.phase !== 'show'}
              aria-label={occupied ? `Number ${value}` : 'Empty cell'}
            >
              {visible ? value : ''}
            </button>
          );
        })}
      </div>

      {obs.phase === 'feedback' && (
        <div className="game-actions">
          <span className="correct-text">
            ✓ You beat {obs.level} {obs.level === 1 ? 'number' : 'numbers'}!
          </span>
          <button className="btn btn-primary" onClick={() => act({ type: 'continue' })} autoFocus>
            Next level
          </button>
        </div>
      )}

      {obs.phase === 'done' && (
        <GameOverlay
          accent="bad"
          title="Wrong square"
          message={
            <>
              The numbers are revealed in the grid (grey = already clicked).
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
