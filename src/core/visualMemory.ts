import { createRng, distinctInts, type Rng } from './rng';
import type { GameEnv, StepResult } from './types';

/**
 * Visual Memory — Human Benchmark's exact loop, ported 1:1:
 *  - every level: 500ms blank board, then the tiles flash for a fixed 1200ms;
 *  - during your turn every click locks in — no undo, no submit button;
 *  - the instant the board exactly matches the pattern the level is won;
 *  - 3 wrong clicks on a level lose a life and restart the SAME level with a
 *    fresh pattern; 3 lives lost ends the run;
 *  - between levels: 500ms recap + 500ms pause, then the next level starts.
 *
 * Grid = floor(sqrt(9 + 3*level)), tiles = 2 + level (HB's formulas).
 * Pure tick-driven (all delays advance via tick(dt) — RL-friendly).
 */
export type VisualMemoryPhase =
  | 'preflip'
  | 'reveal'
  | 'input'
  | 'recap'
  | 'postrecap'
  | 'gameover';

export const PREFLIP_MS = 500;
export const REVEAL_MS = 1200;
export const RECAP_MS = 500;
export const POSTRECAP_MS = 500;
export const MAX_WRONG = 3;
export const LIVES = 3;

export interface VisualMemoryObservation {
  phase: VisualMemoryPhase;
  level: number;
  gridSize: number;
  /** Cells (row-major indices) that are part of the pattern, sorted. */
  tiles: number[];
  /** Cells the player has locked in this round, sorted. */
  picked: number[];
  /** Wrong clicks locked in this round (0..MAX_WRONG). */
  wrongCount: number;
  lives: number;
  /** Result of the level that just ended (only during recap/postrecap). */
  lastCorrect: boolean | null;
  /** Levels cleared (only once the run is done). */
  score: number | null;
}

export type VisualMemoryAction = { type: 'pick'; cell: number };

const PHASE_LIMIT_MS: Partial<Record<VisualMemoryPhase, number>> = {
  preflip: PREFLIP_MS,
  reveal: REVEAL_MS,
  recap: RECAP_MS,
  postrecap: POSTRECAP_MS,
};

export class VisualMemoryEnv implements GameEnv<VisualMemoryObservation, VisualMemoryAction> {
  private rng: Rng;
  private obs!: VisualMemoryObservation;
  private isDone = false;
  private finalScore: number | null = null;
  private startLevel: number;
  private level: number;
  private lives = LIVES;
  private gridSize = 3;
  private tiles: number[] = [];
  private picked: number[] = [];
  private wrongCount = 0;
  private lastCorrect: boolean | null = null;
  private phaseElapsed = 0;

  /** @param startLevel level to begin at (for practicing unlocked levels). */
  constructor(startLevel = 1, seed?: number) {
    this.rng = createRng(seed);
    this.startLevel = Math.max(1, Math.floor(startLevel));
    this.level = this.startLevel;
    this.startPreflip();
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
    this.lives = LIVES;
    this.level = this.startLevel;
    this.lastCorrect = null;
    this.startPreflip();
    return { observation: this.obs, reward: 0, done: false };
  }

  tick(dtMs: number): StepResult<VisualMemoryObservation> {
    if (this.isDone) return { observation: this.obs, reward: 0, done: true };
    const limit = PHASE_LIMIT_MS[this.obs.phase];
    if (limit === undefined) return { observation: this.obs, reward: 0, done: false };
    this.phaseElapsed += dtMs;
    if (this.phaseElapsed < limit) return { observation: this.obs, reward: 0, done: false };
    this.phaseElapsed = 0;
    switch (this.obs.phase) {
      case 'preflip':
        return { observation: this.publish('reveal'), reward: 0, done: false };
      case 'reveal':
        return { observation: this.publish('input'), reward: 0, done: false };
      case 'recap':
        return { observation: this.publish('postrecap'), reward: 0, done: false };
      case 'postrecap':
        return this.advance();
      default:
        return { observation: this.obs, reward: 0, done: false };
    }
  }

  step(action: VisualMemoryAction): StepResult<VisualMemoryObservation> {
    if (this.isDone) return { observation: this.obs, reward: 0, done: true };
    if (action.type !== 'pick' || this.obs.phase !== 'input') return this.noop();
    const cell = Math.floor(action.cell);
    if (!Number.isFinite(cell) || cell < 0 || cell >= this.gridSize * this.gridSize) {
      return this.noop();
    }
    // Human Benchmark: clicking an already-locked square does nothing.
    if (this.picked.includes(cell)) return this.noop();

    this.picked = [...this.picked, cell].sort((a, b) => a - b);
    const correct = this.tiles.includes(cell);
    if (!correct) this.wrongCount += 1;

    // Win = board exactly matches the pattern (all tiles, zero wrong). With
    // picks locking in, any wrong click makes that impossible until the
    // player runs out of misses (HB's core tension).
    const won =
      this.picked.length === this.tiles.length &&
      this.picked.every((c) => this.tiles.includes(c));
    if (won || this.wrongCount >= MAX_WRONG) {
      this.lastCorrect = won;
      this.phaseElapsed = 0;
      return { observation: this.publish('recap'), reward: won ? this.level : 0, done: false };
    }
    return { observation: this.publish('input'), reward: 0, done: false };
  }

  private advance(): StepResult<VisualMemoryObservation> {
    if (this.lastCorrect) {
      this.level += 1;
      this.startPreflip();
      return { observation: this.obs, reward: 0, done: false };
    }
    this.lives -= 1;
    if (this.lives <= 0) {
      this.isDone = true;
      this.finalScore = this.level - 1;
      return { observation: this.publish('gameover'), reward: -1, done: true };
    }
    this.startPreflip(); // same level, fresh pattern
    return { observation: this.obs, reward: 0, done: false };
  }

  private noop(): StepResult<VisualMemoryObservation> {
    return { observation: this.obs, reward: 0, done: this.isDone };
  }

  private startPreflip(): void {
    // Human Benchmark's growth: grid = floor(sqrt(9 + 3*level)), tiles = 2 + level.
    this.gridSize = Math.floor(Math.sqrt(9 + this.level * 3));
    const cellCount = this.gridSize * this.gridSize;
    this.tiles = distinctInts(this.rng, cellCount, Math.min(this.level + 2, cellCount - 1));
    this.picked = [];
    this.wrongCount = 0;
    this.lastCorrect = null;
    this.phaseElapsed = 0;
    this.obs = this.publish('preflip');
  }

  private publish(phase: VisualMemoryPhase): VisualMemoryObservation {
    this.obs = {
      phase,
      level: this.level,
      gridSize: this.gridSize,
      tiles: [...this.tiles],
      picked: [...this.picked],
      wrongCount: this.wrongCount,
      lives: this.lives,
      lastCorrect: this.lastCorrect,
      score: this.isDone ? this.finalScore : null,
    };
    return this.obs;
  }
}
