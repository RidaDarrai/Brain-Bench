import { useCallback, useEffect, useRef, useState } from 'react';
import { AimTrainerEnv, type AimTrainerObservation } from '../core/aimTrainer';
import { formatScore, TESTS } from '../core/tests';
import { playSound } from '../sound';
import GameOverlay from './GameOverlay';
import { useEnv } from './useEnv';
import type { GameProps } from './types';

const META = TESTS['aim-trainer'];
const SPACE = 1000;

/** Map pointer position inside the surface to the env's 1000x1000 space. */
function toVirtual(e: React.MouseEvent<HTMLDivElement>, rect: DOMRect) {
  const x = ((e.clientX - rect.left) / rect.width) * SPACE;
  const y = ((e.clientY - rect.top) / rect.height) * SPACE;
  return { x, y };
}

function Hud({ obs }: { obs: AimTrainerObservation }) {
  const pct =
    obs.timeLimit !== null ? Math.max(0, 1 - obs.elapsed / obs.timeLimit) : null;
  return (
    <div className="game-status">
      <span className="muted">
        {obs.hitCount} / {obs.totalTargets}
      </span>
      <span className="muted"> · {Math.round(obs.elapsed)} ms</span>
      {obs.timeLimit !== null && (
        <span className={pct !== null && pct < 0.25 ? 'aim-danger' : ''}>
          {' '}
          · limit {Math.round(obs.timeLimit / 1000)}s
        </span>
      )}
    </div>
  );
}

export default function AimTrainerGame({ startLevel, onComplete }: GameProps) {
  const { obs, act } = useEnv(() => new AimTrainerEnv(startLevel));
  const surfaceRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const reported = useRef(false);

  // Keep the play field a perfect square (min of surface width/height) so
  // the env's square 1000x1000 space maps 1:1 and targets stay true circles.
  const [fieldSize, setFieldSize] = useState(0);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return undefined;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setFieldSize(Math.floor(Math.min(rect.width, rect.height)));
    });
    ro.observe(surface);
    return () => ro.disconnect();
  }, []);

  const cleared = obs.completed === true ? [startLevel] : [];
  const validForBest = obs.completed === true;

  const finish = useCallback(
    (clearedLevels: number[], best: boolean) => {
      if (reported.current) return;
      reported.current = true;
      onComplete({ score: obs.score ?? 0, cleared: clearedLevels, validForBest: best });
    },
    [obs.score, onComplete],
  );

  const shoot = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x, y } = toVirtual(e, rect);
    // HB: a low blip when you hit the backdrop instead of the target.
    const target = obs.target;
    if (target && Math.hypot(x - target.x, y - target.y) > obs.radius) {
      playSound('blipLow', { volume: 0.2 });
    }
    act({ type: 'shoot', x, y });
  };

  // HB: a high blip each time a new target spawns (i.e. each hit).
  const prevHits = useRef(0);
  useEffect(() => {
    if (obs.hitCount > prevHits.current) playSound('blipHigh', { volume: 0.2 });
    prevHits.current = obs.hitCount;
  }, [obs.hitCount]);

  // Auto-open the overlay once the run ends.
  const [overlay, setOverlay] = useState(false);
  useEffect(() => {
    if (obs.phase === 'done') {
      const t = setTimeout(() => setOverlay(true), 400);
      return () => clearTimeout(t);
    }
    setOverlay(false);
    return undefined;
  }, [obs.phase]);

  return (
    <div className="game game-aim">
      <Hud obs={obs} />
      <div className="aim-surface" ref={surfaceRef}>
        {/*
          The env works in a square 1000x1000 space; the field is a centered
          square (ResizeObserver) so targets stay perfect circles and pixel
          mapping is isotropic (matches hit-testing exactly).
        */}
        <div
          ref={fieldRef}
          className="aim-field"
          style={fieldSize > 0 ? { width: fieldSize, height: fieldSize } : undefined}
          onClick={shoot}
          role="application"
          aria-label="Aim trainer surface"
        >
          {obs.target && (
            <div
              className="aim-target"
              style={{
                left: `${(obs.target.x / SPACE) * 100}%`,
                top: `${(obs.target.y / SPACE) * 100}%`,
                width: `${(obs.radius / SPACE) * 200}%`,
                height: `${(obs.radius / SPACE) * 200}%`,
              }}
            />
          )}
        </div>
        <div className="aim-hud-corner">Level {obs.level}</div>
      </div>

      {overlay && (
        <GameOverlay
          accent={obs.completed === true ? 'good' : 'bad'}
          title={obs.completed === true ? 'Level complete' : "Time's up"}
          message={
            <>
              Average per target: <strong>{formatScore(META, obs.score ?? 0)}</strong>
              <br />
              {obs.completed === true
                ? `You cleared all ${obs.totalTargets} targets.`
                : `You hit ${obs.hitCount} of ${obs.totalTargets} targets.`}
            </>
          }
          onContinue={() => finish(cleared, validForBest)}
        />
      )}
    </div>
  );
}
