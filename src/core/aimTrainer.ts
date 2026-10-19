import { createRng, type Rng } from './rng';
import type { GameEnv, StepResult } from './types';

/**
 * Aim Trainer — leveled. Click targets as fast as possible.
 * Levels add more targets, shrink them, and (later) impose a time limit.
 * Score = average ms per target (lower is better).
 *
 * Coordinates live in a fixed 1000x1000 virtual space so the environment is
 * independent of the viewport; the UI maps pixels <-> virtual units.
 */
export type AimTrainerPhase = 'play' | 'done';

export interface AimTarget {
  x: number;
  y: number;
}

export interface AimTrainerObservation {
  phase: AimTrainerPhase;
  level: number;
  target: AimTarget | null;
  radius: number;
  hitCount: number;
  totalTargets: number;
  /** ms elapsed in the current attempt. */
  elapsed: number;
  /** ms limit for this level (null = untimed). */
  timeLimit: number | null;
  /** true = all targets hit in time, false = ran out of time (only when done). */
  completed: boolean | null;
  score: number | null;
}

export type AimTrainerAction = { type: 'shoot'; x: number; y: number };

const SPACE = 1000;

export class AimTrainerEnv implements GameEnv<AimTrainerObservation, AimTrainerAction> {
  private rng: Rng;
  private obs!: AimTrainerObservation;
  private isDone = false;
  private finalScore: number | null = null;
  private level: number;
  private target: AimTarget | null = null;
  private radius = 40;
  private hitCount = 0;
  private totalTargets = 10;
  private elapsed = 0;
  private timeLimit: number | null = null;

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
    this.isDone = false;
    this.finalScore = null;
    this.configure();
    return { observation: this.obs, reward: 0, done: false };
  }

  tick(dtMs: number): StepResult<AimTrainerObservation> {
    if (this.isDone) return { observation: this.obs, reward: 0, done: true };
    this.elapsed += dtMs;
    if (this.timeLimit !== null && this.elapsed >= this.timeLimit) {
      this.elapsed = this.timeLimit;
      this.finish(false);
      return { observation: this.obs, reward: -1, done: true };
    }
    return { observation: (this.obs = this.publish('play')), reward: 0, done: false };
  }

  step(action: AimTrainerAction): StepResult<AimTrainerObservation> {
    if (action.type !== 'shoot' || this.isDone) {
      return { observation: this.obs, reward: 0, done: this.isDone };
    }
    const t = this.target;
    if (!t) return this.noop();
    const dx = action.x - t.x;
    const dy = action.y - t.y;
    if (dx * dx + dy * dy > this.radius * this.radius) {
      // Miss — small penalty, target stays.
      return { observation: this.obs, reward: -0.1, done: false };
    }
    this.hitCount += 1;
    if (this.hitCount >= this.totalTargets) {
      this.finish(true);
      return { observation: this.obs, reward: 1 + this.level, done: true };
    }
    this.spawn();
    return { observation: (this.obs = this.publish('play')), reward: 1, done: false };
  }

  private noop(): StepResult<AimTrainerObservation> {
    return { observation: this.obs, reward: 0, done: this.isDone };
  }

  private finish(completed: boolean): void {
    const denominator = completed ? this.totalTargets : Math.max(1, this.hitCount);
    this.finalScore = this.elapsed / denominator;
    this.target = null;
    this.isDone = true;
    this.obs = this.publish('done', completed);
  }

  private configure(): void {
    this.totalTargets = Math.min(40, 10 + this.level * 2);
    this.radius = Math.max(18, 50 - this.level * 2.5);
    // Levels 1-4 are untimed; later levels add pressure.
    this.timeLimit =
      this.level < 5 ? null : this.totalTargets * Math.max(300, 700 - (this.level - 5) * 30);
    this.hitCount = 0;
    this.elapsed = 0;
    this.spawn();
    this.obs = this.publish('play');
  }

  private spawn(): void {
    const r = this.radius;
    this.target = {
      x: r + this.rng() * (SPACE - 2 * r),
      y: r + this.rng() * (SPACE - 2 * r),
    };
  }

  private publish(phase: AimTrainerPhase, completed: boolean | null = null): AimTrainerObservation {
    this.obs = {
      phase,
      level: this.level,
      target: this.target ? { ...this.target } : null,
      radius: this.radius,
      hitCount: this.hitCount,
      totalTargets: this.totalTargets,
      elapsed: Math.round(this.elapsed),
      timeLimit: this.timeLimit,
      completed,
      score: this.isDone ? this.finalScore : null,
    };
    return this.obs;
  }
}
