import { createRng, distinctInts, type Rng } from './rng';
import type { GameEnv, StepResult } from './types';

/**
 * Visual Memory — leveled. A grid flashes some squares; reproduce the pattern.
 * Grid grows over levels, more squares to remember each level.
 * Passing a level unlocks the next. Score = levels passed.
 */
export type VisualMemoryPhase = 'show' | 'input' | 'feedback' | 'done';

export interface VisualMemoryObservation {
  phase: VisualMemoryPhase;
  level: number;
  gridSize: number;
  /** Cells (row-major indices) that lit up, sorted. */
  tiles: number[];
  /** Cells currently selected by the player, sorted. */
  selected: number[];
  /** ms left to memorize (only during 'show'). */
  showRemaining: number;
  /** Whether the last submission was correct (only during 'feedback'). */
  correct: boolean | null;
  score: number | null;
}

export type VisualMemoryAction =
  | { type: 'select'; cell: number }
  | { type: 'submit' }
  | { type: 'continue' };

export class VisualMemoryEnv implements GameEnv<VisualMemoryObservation, VisualMemoryAction> {
  private rng: Rng;
  private obs!: VisualMemoryObservation;
  private isDone = false;
  private finalScore: number | null = null;
  private level: number;
  private gridSize = 3;
  private tiles: number[] = [];
  private selected: number[] = [];
  private showRemaining = 0;
  private correct: boolean | null = null;

  /** @param startLevel level to begin at (for practicing unlocked levels). */
  constructor(startLevel = 1, seed?: number) {
    this.rng = createRng(seed);
    this.level = Math.max(1, Math.floor(startLevel));
    this.startShow();
  }

  get observation(): VisualMemoryObservation {
    return this.obs;
  }

  get done(): boolean {
    return this.isDone;
  }

  score(): number | null {
    return this.isDone ? this.finalScore : null;
  }

  reset(): StepResult<VisualMemoryObservation> {
    this.isDone = false;
    this.finalScore = null;
    this.correct = null;
    this.startShow();
    return { observation: this.obs, reward: 0, done: false };
  }

  tick(dtMs: number): StepResult<VisualMemoryObservation> {
    if (this.obs.phase !== 'show') {
      return { observation: this.obs, reward: 0, done: this.isDone };
    }
    this.showRemaining = Math.max(0, this.showRemaining - dtMs);
    if (this.showRemaining === 0) {
      return { observation: (this.obs = this.publish('input')), reward: 0, done: false };
    }
    return { observation: (this.obs = this.publish('show')), reward: 0, done: this.isDone };
  }

  step(action: VisualMemoryAction): StepResult<VisualMemoryObservation> {
    if (this.isDone) return { observation: this.obs, reward: 0, done: true };
    switch (action.type) {
      case 'select': {
        if (this.obs.phase !== 'input') return this.noop();
        const cell = Math.floor(action.cell);
        if (cell < 0 || cell >= this.gridSize * this.gridSize) return this.noop();
        if (this.selected.includes(cell)) {
          this.selected = this.selected.filter((c) => c !== cell);
        } else {
          this.selected = [...this.selected, cell].sort((a, b) => a - b);
        }
        return { observation: (this.obs = this.publish('input')), reward: 0, done: false };
      }
      case 'submit': {
        if (this.obs.phase !== 'input' || this.selected.length === 0) return this.noop();
        this.correct =
          this.selected.length === this.tiles.length &&
          this.selected.every((c, i) => c === this.tiles[i]);
        if (!this.correct) {
          this.finalScore = this.level - 1;
          this.isDone = true;
          return { observation: (this.obs = this.publish('done')), reward: -1, done: true };
        }
        return { observation: (this.obs = this.publish('feedback')), reward: this.level, done: false };
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

  private noop(): StepResult<VisualMemoryObservation> {
    return { observation: this.obs, reward: 0, done: this.isDone };
  }

  private startShow(): void {
    this.gridSize = Math.min(8, 2 + Math.ceil(this.level / 2));
    const cellCount = this.gridSize * this.gridSize;
    const tileCount = Math.min(this.level + 2, cellCount - 1);
    this.tiles = distinctInts(this.rng, cellCount, tileCount);
    this.selected = [];
    this.showRemaining = 900 + 300 * tileCount;
    this.obs = this.publish('show');
  }

  private publish(phase: VisualMemoryPhase): VisualMemoryObservation {
    this.obs = {
      phase,
      level: this.level,
      gridSize: this.gridSize,
      tiles: [...this.tiles],
      selected: [...this.selected],
      showRemaining: Math.round(this.showRemaining),
      correct: this.correct,
      score: this.isDone ? this.finalScore : null,
    };
    return this.obs;
  }
}
