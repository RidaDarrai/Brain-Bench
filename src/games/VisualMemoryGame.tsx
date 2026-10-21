import { useCallback, useEffect, useRef, useState } from 'react';
import { VisualMemoryEnv } from '../core/visualMemory';
import GameOverlay from './GameOverlay';
import { levelsBetween, useEnv } from './useEnv';
import { Button } from '@/components/ui/button';
import type { GameProps } from './types';

export default function VisualMemoryGame({ startLevel, onComplete }: GameProps) {
  const { obs, act } = useEnv(() => new VisualMemoryEnv(startLevel));
  const reported = useRef(false);

  // Cells picked wrongly this round: shake first, then stay red.
  const [wrongCells, setWrongCells] = useState<Set<number>>(new Set());

  // Fresh round → clear the red marks.
  useEffect(() => {
    if (obs.phase === 'show') setWrongCells(new Set());
  }, [obs.phase]);

  const finish = useCallback(
    (cleared: number[]) => {
      if (reported.current) return;
      reported.current = true;
      onComplete({ score: obs.score ?? 0, cleared });
    },
    [obs.score, onComplete],
  );
  const cleared = levelsBetween(startLevel, obs.score ?? 0);

  const isShowing = obs.phase === 'show';
  const totalShowMs = 900 + 300 * obs.tiles.length;

  const toggle = (cell: number) => act({ type: 'select', cell });
  const submit = () => act({ type: 'submit' });

  // Toggle selection and remember wrong picks so they can zigzag → red.
  const onCell = (cell: number) => {
    if (obs.phase !== 'input') return;
    const pickingWrong = !obs.tiles.includes(cell) && !obs.selected.includes(cell);
    const clearingWrong = wrongCells.has(cell);
    toggle(cell);
    if (pickingWrong) {
      setWrongCells((prev) => new Set(prev).add(cell));
    } else if (clearingWrong) {
      setWrongCells((prev) => {
        const next = new Set(prev);
        next.delete(cell);
        return next;
      });
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (obs.phase === 'input') submit();
      else if (obs.phase === 'feedback') act({ type: 'continue' });
    }
  };

  return (
    <div className="game game-visual" onKeyDown={onKey} tabIndex={-1}>
      <div className="game-status">
        <span className="muted">Level {obs.level}</span>
        <span className="muted"> · {obs.tiles.length} squares</span>
      </div>

      <div
        className="vis-grid"
        style={{ gridTemplateColumns: `repeat(${obs.gridSize}, 1fr)` }}
        role="grid"
        aria-label="Memory grid"
      >
        {Array.from({ length: obs.gridSize * obs.gridSize }, (_, cell) => {
          const lit = isShowing && obs.tiles.includes(cell);
          const selected = !isShowing && obs.selected.includes(cell);
          const revealed = obs.phase === 'done' && obs.tiles.includes(cell);
          const wrong = wrongCells.has(cell);
          return (
            <button
              key={cell}
              className={`vis-cell${lit ? ' lit' : ''}${selected ? ' selected' : ''}${
                selected && !wrong ? ' flip' : ''
              }${wrong ? ' wrong' : ''}${revealed ? ' revealed' : ''}`}
              onClick={() => onCell(cell)}
              disabled={obs.phase !== 'input'}
              aria-label={`Cell ${cell + 1}`}
            />
          );
        })}
      </div>

      {isShowing && (
        <div className="vis-timer" aria-hidden="true">
          <div
            className="vis-timer-fill"
            style={{ width: `${Math.min(100, (obs.showRemaining / totalShowMs) * 100)}%` }}
          />
        </div>
      )}

      {obs.phase === 'input' && (
        <div className="game-actions">
          <span className="muted">
            {obs.selected.length} / {obs.tiles.length} selected
          </span>
          <Button onClick={submit} disabled={obs.selected.length === 0}>
            Submit
          </Button>
        </div>
      )}

      {obs.phase === 'feedback' && (
        <div className="game-actions">
          <span className="correct-text">✓ Correct!</span>
          <Button onClick={() => act({ type: 'continue' })} autoFocus>
            Next level
          </Button>
        </div>
      )}

      {obs.phase === 'done' && (
        <GameOverlay
          accent="bad"
          title="Wrong pattern"
          message={
            <>
              The lit squares are shown in <strong>green</strong>.
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
