import { createRng, randomInt, type Rng } from './rng';
import type { GameEnv, StepResult } from './types';

/**
 * Number Memory — leveled. Level N shows an N-digit number; type it back.
 * Passing a level unlocks N+1. Score = levels passed.
 */
export type NumberMemoryPhase = 'show' | 'input' | 'feedback' | 'done';

export interface NumberMemoryObservation {
  phase: NumberMemoryPhase;
  level: number;
  number: string;
  input: string;
  /** ms left to memorize (only during 'show'). */
  showRemaining: number;
  /** Whether the last submission was correct (only during 'feedback'). */
  correct: boolean | null;
  score: number | null;
}

export type NumberMemoryAction =
  | { type: 'input'; value: string }
  | { type: 'submit' }
  | { type: 'continue' };

export class NumberMemoryEnv implements GameEnv<NumberMemoryObservation, NumberMemoryAction> {
  private rng: Rng;
  private obs!: NumberMemoryObservation;
  private isDone = false;
  private finalScore: number | null = null;
  private level: number;
  private number = '';
  private input = '';
  private showRemaining = 0;
  private correct: boolean | null = null;

  /** @param startLevel level to begin at (for practicing unlocked levels). */
  constructor(startLevel = 1, seed?: number) {
    this.rng = createRng(seed);
    this.level = Math.max(1, Math.floor(startLevel));
    this.startShow();
  }

  get observation(): NumberMemoryObservation {
    return this.obs;
  }

  get done(): boolean {
    return this.isDone;
  }

  score(): number | null {
    return this.isDone ? this.finalScore : null;
  }

  reset(): StepResult<NumberMemoryObservation> {
    this.isDone = false;
    this.finalScore = null;
    this.correct = null;
    this.startShow();
    return { observation: this.obs, reward: 0, done: false };
  }

  tick(dtMs: number): StepResult<NumberMemoryObservation> {
    if (this.obs.phase !== 'show') {
      return { observation: this.obs, reward: 0, done: this.isDone };
    }
    this.showRemaining = Math.max(0, this.showRemaining - dtMs);
    if (this.showRemaining === 0) {
      return { observation: (this.obs = this.publish('input')), reward: 0, done: false };
    }
    return { observation: (this.obs = this.publish('show')), reward: 0, done: this.isDone };
  }

  step(action: NumberMemoryAction): StepResult<NumberMemoryObservation> {
    if (this.isDone) return { observation: this.obs, reward: 0, done: true };
    switch (action.type) {
      case 'input': {
        if (this.obs.phase !== 'input') return this.noop();
        // Digits only, never longer than the target number.
        this.input = action.value.replace(/\D/g, '').slice(0, this.number.length);
        return { observation: (this.obs = this.publish('input')), reward: 0, done: false };
      }
      case 'submit': {
        if (this.obs.phase !== 'input' || this.input.length === 0) return this.noop();
        this.correct = this.input === this.number;
        if (!this.correct) {
          // Wrong answer ends the run; you keep the levels you passed.
          this.finalScore = this.level - 1;
          this.isDone = true;
          return {
            observation: (this.obs = this.publish('done')),
            reward: -1,
            done: true,
          };
        }
        return {
          observation: (this.obs = this.publish('feedback')),
          reward: this.level,
          done: false,
        };
      }
      case 'continue': {
        if (this.obs.phase !== 'feedback') return this.noop();
        this.level += 1;
        this.correct = null;
        this.startShow();
        return { observation: this.obs, reward: 0, done: false };
      }
      default:
        return this.noop();
    }
  }

  private noop(): StepResult<NumberMemoryObservation> {
    return { observation: this.obs, reward: 0, done: this.isDone };
  }

  private startShow(): void {
    let digits = String(1 + randomInt(this.rng, 9));
    for (let i = 1; i < this.level; i++) digits += String(randomInt(this.rng, 10));
    this.number = digits;
    this.input = '';
    this.showRemaining = 900 + 450 * this.level;
    this.obs = this.publish('show');
  }

  private publish(phase: NumberMemoryPhase): NumberMemoryObservation {
    this.obs = {
      phase,
      level: this.level,
      number: this.number,
      input: this.input,
      showRemaining: Math.round(this.showRemaining),
      correct: this.correct,
      score: this.isDone ? this.finalScore : null,
    };
    return this.obs;
  }
}
