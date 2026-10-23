import { useCallback, useRef } from 'react';
import { ChimpTestEnv } from '../core/chimpTest';
import GameOverlay from './GameOverlay';
import { levelsBetween, useEnv } from './useEnv';
import { Button } from '@/components/ui/button';
import { playSound, pitchRatio } from '../sound';
import type { GameProps } from './types';

const MIN_CHIMP_LEVEL = 4;
const MAX_CHIMP_CARDS = 40; // HB's Dv * Fv — beating this board ends the run
const MAX_CHIMP_STRIKES = 3; // HB's _T

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

  // HB score = the digit count you died on (their scoreScreen); a run that
  // died at N has passed every level up to N - 1.
  const score = obs.score ?? 0;
  const cleared = levelsBetween(initial, score - 1);

  const select = (cell: number) => {
    if (obs.phase === 'play') {
      const card = obs.cards.find((c) => c.cell === cell && !c.cleared);
      if (card) {
        if (card.value === obs.expected) {
          // HB's boops: one major-scale step up per number (vol .2), the
          // completing pick a touch louder (.25); the 40-cap beat is silent.
          const completes = obs.expected >= obs.level;
          if (!(completes && obs.level >= MAX_CHIMP_CARDS)) {
            playSound('boop', {
              pitch: pitchRatio(card.value - 1),
              volume: completes ? 0.25 : 0.2,
            });
          }
        } else {
          // Strikes: three scale steps down, four on the fatal one (HB .25).
          playSound('boop', {
            pitch: pitchRatio(obs.strikes + 1 >= MAX_CHIMP_STRIKES ? -4 : -3),
            volume: 0.25,
          });
        }
      }
    }
    act({ type: 'select', cell });
  };

  return (
    <div className="game game-chimp">
      <div className="chimp-desktop">
        {/* Human Benchmark shows no status line during play — just the grid. */}
        <div className="chimp-grid" role="grid" aria-label="Chimp grid">
          {Array.from({ length: obs.rows }, (_, row) => (
            <div className="chimp-row" key={row} role="row">
              {Array.from({ length: obs.cols }, (_, col) => {
                const cell = row * obs.cols + col;
                const card = obs.cards.find((c) => c.cell === cell && !c.cleared);
                const live = card !== undefined;
                const hidden = live && !obs.numbersVisible;
                return (
                  <button
                    key={cell}
                    className={`chimp-cell${live ? ' live' : ''}${hidden ? ' hidden' : ''}`}
                    onClick={() => select(cell)}
                    disabled={!live || obs.phase !== 'play'}
                    aria-label={live ? `Number ${card.value}` : 'Empty cell'}
                    data-cellnumber={live ? card.value : undefined}
                  >
                    {live && !hidden ? card.value : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* HB's stat bar: NUMBERS shows the NEXT board's size (the level has
            already incremented on a win, unchanged on a strike). */}
        {(obs.phase === 'beat' || obs.phase === 'failed') && (
          <div className="game-actions chimp-hud">
            <span className="chimp-stat">
              <span className="chimp-stat-label">NUMBERS</span>
              <span className="chimp-stat-value hud-num">{obs.level}</span>
            </span>
            <span className="chimp-stat">
              <span className="chimp-stat-label">STRIKES</span>
              <span className="chimp-stat-value hud-num">
                {obs.strikes} of {MAX_CHIMP_STRIKES}
              </span>
            </span>
            <Button onClick={() => act({ type: 'continue' })} autoFocus>
              Continue
            </Button>
          </div>
        )}

        {obs.phase === 'done' && (
          <GameOverlay
            accent={obs.correct ? 'good' : 'bad'}
            title={obs.correct ? 'Perfect run' : 'Three strikes'}
            message={
              <>
                You reached {score} {score === 1 ? 'number' : 'numbers'}.
                <br />
                You passed {cleared.length} {cleared.length === 1 ? 'level' : 'levels'}.
              </>
            }
            onContinue={() => finish(cleared)}
          />
        )}
      </div>

      {/* HB's desktop-only warning, shown below their 700px breakpoint
          (ours sits at 760px: the 720px grid + the card's 20px padding). */}
      <div className="chimp-warning">
        <p>
          This test is intended to be taken with a keyboard, please take it on a desktop or laptop.
          (Or make your browser window larger)
        </p>
      </div>
    </div>
  );
}
