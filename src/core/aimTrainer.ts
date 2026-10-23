import { createRng, type Rng } from './rng';
import type { GameEnv, StepResult } from './types';

/**
 * Aim Trainer — Human Benchmark parity (HB reducer `lX`):
 *  - fixed 970x500 field, one bullseye at a time, 30 counted targets
 *  - intro: a centered target sits under HB's "Click the target above to
 *    begin."; its timing is never recorded (HB excludes results[0] from the
 *    average: `uX(e)/(e.results.length-1)`)
 *  - misses record nothing (HB `clickedBackdrop` only plays a low blip)
 *  - score = mean ms of the 30 counted hits (HB `Hw`)
 *  - spawn: x in [S, 970-S], y in [S, 500-S] with S = target size (HB `$t`)
 *
 * Our unlock knob: level scales the target size (L1 = HB's exact 100px).
 * Timing is tick-driven — no timers, no Date.now — so episodes are
 * reproducible for RL/debugging.
 */
export type AimTrainerPhase = 'intro' | 'play' | 'done';

export interface AimTarget {
  x: number;
  y: number;
}

export interface AimTrainerObservation {
  phase: AimTrainerPhase;
  level: number;
  target: AimTarget | null;
  /** Target diameter in field units (HB `$t`). */
  size: number;
  hitCount: number;
  totalTargets: number;
  /** true on done — the run always completes (HB has no fail state). */
  completed: boolean | null;
  score: number | null;
}

export type AimTrainerAction = { type: 'shoot'; x: number; y: number };

export const FIELD_W = 970; // HB BT
export const FIELD_H = 500; // HB HT
export const TOTAL_TARGETS = 30; // HB Dh

const START_SIZE = 100; // HB $t
const SIZE_STEP = 5;
const MIN_SIZE = 30;

/** Level knob: L1 is HB's exact target size; deeper levels shrink it. */
export function targetSizeForLevel(level: number): number {
  return Math.max(MIN_SIZE, START_SIZE - (Math.max(1, Math.floor(level)) - 1) * SIZE_STEP);
}

export class AimTrainerEnv implements GameEnv<AimTrainerObservation, AimTrainerAction> {
  private rng: Rng;
  private obs!: AimTrainerObservation;
  private isDone = false;
  private finalScore: number | null = null;
  private level: number;
  private phase: AimTrainerPhase = 'intro';
  private target: AimTarget | null = null;
  private size = START_SIZE;
  private hitCount = 0;
  private completed: boolean | null = null;
  /** ms clock; advances only while playing, only via tick. */
  private elapsed = 0;
  /** elapsed reading at the current target's spawn. */
  private spawnAt = 0;
  /** per-target ms of the COUNTED hits (never the opener). */
  private durations: number[] = [];

  /** @param startLevel level to begin at (for practicing unlocked levels). */
  constructor(startLevel = 1, seed?: number) {
    this.rng = createRng(seed);
    this.level = Math.max(1, Math.floor(startLevel));
    this.configure();
  }

  get observation(): AimTrainerObservation {
    return this.obs;
  }

  get done(): boolean {
    return this.isDone;
  }

  score(): number | null {
    return this.isDone ? this.finalScore : null;
  }

  reset(): StepResult<AimTrainerObservation> {
    this.configure();
    return { observation: this.obs, reward: 0, done: false };
  }

  /** Timing only — nothing observable changes, so the obs identity is stable. */
  tick(dtMs: number): StepResult<AimTrainerObservation> {
    if (this.isDone) return { observation: this.obs, reward: 0, done: true };
    if (this.phase === 'play') this.elapsed += dtMs;
    return { observation: this.obs, reward: 0, done: false };
  }

  step(action: AimTrainerAction): StepResult<AimTrainerObservation> {
    if (action.type !== 'shoot' || this.isDone) return this.noop();
    // Reject non-finite coordinates (NaN/Infinity must never count as a hit).
    if (!Number.isFinite(action.x) || !Number.isFinite(action.y)) return this.noop();
    const t = this.target;
    if (!t) return this.noop();
    const r = this.size / 2;
    const dx = action.x - t.x;
    const dy = action.y - t.y;
    if (dx * dx + dy * dy > r * r) {
      // HB clickedBackdrop: record nothing, change nothing (the UI blips).
      return { observation: this.obs, reward: 0, done: false };
    }
    if (this.phase === 'intro') {
      // Opener: starts the run and spawns the first counted target. HB records
      // this click as results[0] and excludes it from the average — we simply
      // never record it.
      this.phase = 'play';
      this.elapsed = 0;
      this.spawn();
      return { observation: (this.obs = this.publish()), reward: 0, done: false };
    }
    this.durations.push(Math.max(0, this.elapsed - this.spawnAt));
    this.hitCount += 1;
    if (this.hitCount >= TOTAL_TARGETS) {
      this.finish();
      return { observation: this.obs, reward: 1 + this.level, done: true };
    }
    this.spawn();
    return { observation: (this.obs = this.publish()), reward: 1, done: false };
  }

  private noop(): StepResult<AimTrainerObservation> {
    return { observation: this.obs, reward: 0, done: this.isDone };
  }

  private finish(): void {
    const sum = this.durations.reduce((a, b) => a + b, 0);
    this.finalScore = sum / Math.max(1, this.durations.length); // HB Hw
    this.phase = 'done';
    this.completed = true;
    this.target = null;
    this.isDone = true;
    this.obs = this.publish();
  }

  private spawn(): void {
    const s = this.size;
    this.target = {
      x: this.rng() * (FIELD_W - 2 * s) + s, // HB: Math.random()*(BT-2*$t)+$t
      y: this.rng() * (FIELD_H - 2 * s) + s,
    };
    this.spawnAt = this.elapsed;
  }

  private configure(): void {
    this.isDone = false;
    this.finalScore = null;
    this.phase = 'intro';
    this.size = targetSizeForLevel(this.level);
    this.hitCount = 0;
    this.completed = null;
    this.elapsed = 0;
    this.spawnAt = 0;
    this.durations = [];
    this.target = { x: FIELD_W / 2, y: FIELD_H / 2 }; // HB UT: BT/2, HT/2
    this.obs = this.publish();
  }

  private publish(): AimTrainerObservation {
    this.obs = {
      phase: this.phase,
      level: this.level,
      target: this.target ? { ...this.target } : null,
      size: this.size,
      hitCount: this.hitCount,
      totalTargets: TOTAL_TARGETS,
      completed: this.completed,
      score: this.isDone ? this.finalScore : null,
    };
    return this.obs;
  }
}
