import { useCallback, useEffect, useRef, useState } from 'react';
import { AimTrainerEnv, FIELD_H, FIELD_W, TOTAL_TARGETS } from '../core/aimTrainer';
import { formatScore, TESTS } from '../core/tests';
import { playSound } from '../sound';
import GameOverlay from './GameOverlay';
import { useEnv } from './useEnv';
import type { GameProps } from './types';

const META = TESTS['aim-trainer'];
const ASPECT = FIELD_W / FIELD_H;

export default function AimTrainerGame({ startLevel, onComplete }: GameProps) {
  const { obs, act } = useEnv(() => new AimTrainerEnv(startLevel));
  const surfaceRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const reported = useRef(false);

  // HB's field is a fixed 970x500; fit that aspect inside the surface (JS
  // because both dimensions must clamp together — CSS aspect-ratio cannot
  // shrink the width when max-height bites).
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return undefined;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.height <= 0 || rect.width <= 0) return;
      // Fit the aspect, then clamp at HB's exact 970x500 — the field scales
      // down for small windows but never up (targets stay ≤ HB's 100px).
      const h = Math.min(rect.height, rect.width / ASPECT, FIELD_H);
      setBox({ w: h * ASPECT, h });
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

  // One surface-level mousedown decides everything: HB's `zo` (stopPropagation
  // + preventDefault) exists to stop target clicks from reaching the backdrop
  // handler — a single handler gets that right by construction.
  const shoot = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // HB zo
    if (obs.phase === 'done') return;
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * FIELD_W;
    const y = ((e.clientY - rect.top) / rect.height) * FIELD_H;
    const t = obs.target;
    const hit = t !== null && Math.hypot(x - t.x, y - t.y) <= obs.size / 2;
    // HB clickedBackdrop → low blip (target hits never fire it: zo stops it).
    if (!hit) playSound('blipLow', { volume: 0.2 });
    act({ type: 'shoot', x, y });
  };

  // HB: every new target plays blipHigh — each hit's spawn, ...
  const prevHits = useRef(0);
  useEffect(() => {
    if (obs.hitCount > prevHits.current) playSound('blipHigh', { volume: 0.2 });
    prevHits.current = obs.hitCount;
  }, [obs.hitCount]);

  // ... and the opener's spawn when the run starts.
  const prevPhase = useRef(obs.phase);
  useEffect(() => {
    if (prevPhase.current === 'intro' && obs.phase === 'play') {
      playSound('blipHigh', { volume: 0.2 });
    }
    prevPhase.current = obs.phase;
  }, [obs.phase]);

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

  // Target radius in px — the intro text anchors to it so it can never
  // collide with the bullseye (fallback = unscaled before the field measures).
  const radiusPx = box.w > 0 ? (obs.size / 2) * (box.w / FIELD_W) : obs.size / 2;

  return (
    <div className="game game-aim">
      <div className="aim-desktop">
        <div
          className="aim-surface"
          ref={surfaceRef}
          onMouseDown={shoot}
          role="application"
          aria-label="Aim trainer surface"
          style={{ '--aim-r': `${radiusPx}px` } as React.CSSProperties}
        >
          {/*
            HB intro copy, re-anchored: title above the centered target,
            lines below it, both a fixed gap from --aim-r (HB's fixed 150px
            spacer only clears a fixed 970px field).
          */}
          {obs.phase === 'intro' && (
            <div className="aim-intro anim-slide-fade-in">
              <div className="aim-intro-head">
                <h1>Aim Trainer</h1>
              </div>
              <div className="aim-intro-lines">
                <p>Hit 30 targets as quickly as you can.</p>
                <p>Click the target above to begin.</p>
              </div>
            </div>
          )}

          {/* HB Qu chip: "Remaining" label + count (only while playing). */}
          {obs.phase === 'play' && (
            <span className="aim-remaining">
              <span className="aim-remaining-label">Remaining</span>
              <span>{TOTAL_TARGETS - obs.hitCount}</span>
            </span>
          )}

          <div
            ref={fieldRef}
            className="aim-field"
            style={
              box.w > 0
                ? ({
                    width: box.w,
                    height: box.h,
                    // HB draws 2px rings/cross on a 970px field; scale them with
                    // the field so small viewports keep the same proportions.
                    '--aim-scale': Math.max(0.5, box.w / FIELD_W),
                  } as React.CSSProperties)
                : undefined
            }
          >
            {obs.target && (
              <div
                className="aim-target"
                data-aim-target
                // HB keys each target by its spawn time so the pop-in replays;
                // phase+hitCount changes exactly when a new target appears.
                key={`${obs.phase}:${obs.hitCount}`}
                style={{
                  left: `${(obs.target.x / FIELD_W) * 100}%`,
                  top: `${(obs.target.y / FIELD_H) * 100}%`,
                  width: `${(obs.size / FIELD_W) * 100}%`,
                  height: `${(obs.size / FIELD_H) * 100}%`,
                }}
              >
                {/* HB target stack: sX disc, 3 Fh rings, 2 Bw cross bars. */}
                <span className="aim-disc" />
                <span className="aim-ring" style={{ width: '33.333%', height: '33.333%' }} />
                <span className="aim-ring" style={{ width: '66.667%', height: '66.667%' }} />
                <span className="aim-ring" style={{ width: '100%', height: '100%' }} />
                <span className="aim-cross aim-cross-v" />
                <span className="aim-cross aim-cross-h" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="aim-warning">
        <p>
          This test is intended to be taken on a desktop or laptop. (Or make your browser window
          larger)
        </p>
      </div>

      {overlay && (
        <GameOverlay
          accent="good"
          title="Level complete"
          message={
            <>
              Average time per target: <strong>{formatScore(META, obs.score ?? 0)}</strong>
              <br />
              You cleared all {obs.totalTargets} targets.
            </>
          }
          onContinue={() => finish(cleared, validForBest)}
        />
      )}
    </div>
  );
}
