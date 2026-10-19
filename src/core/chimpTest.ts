import { createRng, distinctInts, type Rng } from './rng';
import type { GameEnv, StepResult } from './types';

/**
 * Chimp Test — leveled, inspired by Kyoto University research where young
 * chimpanzees outperform humans at rapid number recall.
 *
 * Numbers 1..N are scattered on a grid. Click "1" and all numbers hide;
 * then click the remaining numbers in ascending order. One mistake ends the run.
 * Passing a level unlocks the next (N+1). Score = levels passed.
 */
export type ChimpTestPhase = 'show' | 'feedback' | 'done';

export interface ChimpCard {
  cell: number;
  value: number;
}

export interface ChimpTestObservation {
  phase: ChimpTestPhase;
  /** Number of cards this level (N). */
  level: number;
  cols: number;
  rows: number;
  cards: ChimpCard[];
  /** False once the player clicks 1 and the numbers hide. */
  numbersVisible: boolean;
  /** The next number the player must click (1..N+1; N+1 = level complete). */
  expected: number;
  /** Whether the last level attempt was correct (only during 'feedback'). */
  correct: boolean | null;
  score: number | null;
}

export type ChimpTestAction = { type: 'select'; cell: number } | { type: 'continue' };

const COLS = 8;
const ROWS = 6;

export class ChimpTestEnv implements GameEnv<ChimpTestObservation, ChimpTestAction> {
  private rng: Rng;
  private obs!: ChimpTestObservation;
  private isDone = false;
  private finalScore: number | null = null;
  private level: number;
  private cards: ChimpCard[] = [];
  private numbersVisible = true;
  private expected = 1;
  private correct: boolean | null = null;

  /** @param startLevel level to begin at (for practicing unlocked levels). */
  constructor(startLevel = 4, seed?: number) {
    this.rng = createRng(seed);
    this.level = Math.max(1, Math.floor(startLevel));
    this.deal();
  }

  get observation(): ChimpTestObservation {
    return this.obs;
  }

  get done(): boolean {
    return this.isDone;
  }

  score(): number | null {
    return this.isDone ? this.finalScore : null;
  }

  reset(): StepResult<ChimpTestObservation> {
    this.isDone = false;
    this.finalScore = null;
    this.correct = null;
    this.deal();
    return { observation: this.obs, reward: 0, done: false };
  }

  tick(_dtMs: number): StepResult<ChimpTestObservation> {
    return { observation: this.obs, reward: 0, done: this.isDone };
  }

  step(action: ChimpTestAction): StepResult<ChimpTestObservation> {
    if (this.isDone) return { observation: this.obs, reward: 0, done: true };
    switch (action.type) {
      case 'select': {
        if (this.obs.phase !== 'show') return this.noop();
        const card = this.cards.find((c) => c.cell === action.cell);
        if (this.numbersVisible) {
          // First click must be on "1"; then everything hides.
          if (!card || card.value !== 1) return this.fail();
          this.numbersVisible = false;
          this.expected = 2;
          return { observation: (this.obs = this.publish('show')), reward: 0, done: false };
        }
        if (!card || card.value !== this.expected) return this.fail();
        this.expected += 1;
        if (this.expected > this.level) {
          this.correct = true;
          return {
            observation: (this.obs = this.publish('feedback')),
            reward: this.level,
            done: false,
          };
        }
        return { observation: (this.obs = this.publish('show')), reward: 1, done: false };
      }
      case 'continue': {
        if (this.obs.phase !== 'feedback') return this.noop();
        this.level += 1;
        this.correct = null;
        this.deal();
        return { observation: this.obs, reward: 0, done: false };
      }
      default:
        return this.noop();
    }
  }

  private noop(): StepResult<ChimpTestObservation> {
    return { observation: this.obs, reward: 0, done: this.isDone };
  }

  private fail(): StepResult<ChimpTestObservation> {
    this.correct = false;
    this.finalScore = this.level - 1;
    this.isDone = true;
    return { observation: (this.obs = this.publish('done')), reward: -1, done: true };
  }

  private deal(): void {
    const cells = distinctInts(this.rng, COLS * ROWS, this.level);
    this.cards = cells.map((cell, i) => ({ cell, value: i + 1 }));
    this.numbersVisible = true;
    this.expected = 1;
    this.obs = this.publish('show');
  }

  private publish(phase: ChimpTestPhase): ChimpTestObservation {
    this.obs = {
      phase,
      level: this.level,
      cols: COLS,
      rows: ROWS,
      cards: this.cards.map((c) => ({ ...c })),
      numbersVisible: this.numbersVisible,
      expected: this.expected,
      correct: this.correct,
      score: this.isDone ? this.finalScore : null,
    };
    return this.obs;
  }
}
