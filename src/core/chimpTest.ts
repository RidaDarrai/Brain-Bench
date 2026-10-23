import { createRng, randomInt, type Rng } from './rng';
import type { GameEnv, StepResult } from './types';

/**
 * Chimp Test — Human Benchmark's version of the Kyoto University working-memory
 * task: numbers 1..N scattered on a grid, click them in order while the rest
 * stay hidden.
 *
 * Ported from HB's `xT` reducer (their bundle) — every rule below is theirs:
 * - 8×5 grid (40 cells = their Dv*Fv), N = level (starts at 4 = their Ai,
 *   +1 per beaten level, the run ends after beating the 40-board with 41)
 * - the 4-number board is sighted: numbers only ever hide from N > 4 on
 *   (their `hideNumbers: level > 0`), and they start visible on every board
 * - empty and already-picked cells are IGNORED — only a wrong NUMBER strikes
 * - strike < 3: the board blanks (`board: ST()`) and Continue re-deals the
 *   SAME N with a fresh layout, strikes carry over
 * - 3rd strike: game over — score = the N you died on (their scoreScreen)
 * - beating a level: every card is cleared (the grid reads empty) and the
 *   level (→ NUMBERS stat) is already the NEXT board's size
 * One mistake no longer ends the run — three strikes do.
 */
export type ChimpTestPhase = 'play' | 'beat' | 'failed' | 'done';

export interface ChimpCard {
  cell: number;
  value: number;
  /** Picked already — HB clears it and the slot renders as an empty space. */
  cleared: boolean;
}

export interface ChimpTestObservation {
  phase: ChimpTestPhase;
  /** Digit count on the board (HB's level index + 4). */
  level: number;
  cols: number;
  rows: number;
  strikes: number;
  cards: ChimpCard[];
  /** False once a correct pick hides the numbers (never on the 4-card board). */
  numbersVisible: boolean;
  /** The number the player must click next (1..level+1; level+1 = beaten). */
  expected: number;
  /** Whether the last level attempt was correct (only during beat/failed/done). */
  correct: boolean | null;
  score: number | null;
}

export type ChimpTestAction = { type: 'select'; cell: number } | { type: 'continue' };

const COLS = 8; // HB's Dv
const ROWS = 5; // HB's Fv
const MAX_CARDS = COLS * ROWS; // 40 — HB ends the run after beating this board
const START_CARDS = 4; // HB's Ai
const MAX_STRIKES = 3; // HB's _T

export class ChimpTestEnv implements GameEnv<ChimpTestObservation, ChimpTestAction> {
  private rng: Rng;
  private obs!: ChimpTestObservation;
  private isDone = false;
  private finalScore: number | null = null;
  private readonly startLevel: number;
  private level: number;
  private strikes = 0;
  private cards: ChimpCard[] = [];
  private numbersVisible = true;
  private expected = 1;
  private correct: boolean | null = null;

  /** @param startLevel digit count to begin at (for practicing unlocked levels). */
  constructor(startLevel = START_CARDS, seed?: number) {
    this.rng = createRng(seed);
    this.startLevel = Math.max(START_CARDS, Math.floor(startLevel));
    this.level = this.startLevel;
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
    this.strikes = 0;
    this.level = this.startLevel;
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
        if (this.obs.phase !== 'play') return this.noop();
        const card = this.cards.find((c) => c.cell === action.cell && !c.cleared);
        if (!card) return this.noop(); // empty slot / already picked: HB ignores it
        if (card.value !== this.expected) return this.strike();
        card.cleared = true;
        this.expected += 1;
        // HB: hideNumbers = level > 0 — the 4-card board stays sighted,
        // every larger board hides after the first correct pick.
        this.numbersVisible = this.level <= START_CARDS;
        if (this.expected > this.level) return this.beat();
        this.obs = this.publish('play');
        return { observation: this.obs, reward: 1, done: false };
      }
      case 'continue': {
        if (this.obs.phase !== 'beat' && this.obs.phase !== 'failed') return this.noop();
        this.deal(); // fresh deal — same N after a strike, N+1 after a win
        return { observation: this.obs, reward: 0, done: false };
      }
      default:
        return this.noop();
    }
  }

  private noop(): StepResult<ChimpTestObservation> {
    return { observation: this.obs, reward: 0, done: this.isDone };
  }

  private strike(): StepResult<ChimpTestObservation> {
    this.strikes += 1;
    if (this.strikes >= MAX_STRIKES) {
      this.correct = false;
      this.finalScore = this.level; // HB: score = the digit count you died on
      this.isDone = true;
      return { observation: (this.obs = this.publish('done')), reward: -1, done: true };
    }
    this.cards = []; // HB: board = ST() — the grid vanishes until Continue
    return { observation: (this.obs = this.publish('failed')), reward: 0, done: false };
  }

  private beat(): StepResult<ChimpTestObservation> {
    this.correct = true;
    if (this.level >= MAX_CARDS) {
      // HB: level + Ai >= Dv * Fv → scoreScreen straight away (score = 41).
      this.finalScore = this.level + 1;
      this.isDone = true;
      return { observation: (this.obs = this.publish('done')), reward: this.finalScore, done: true };
    }
    // Level increments before the HUD reads it: NUMBERS = the NEXT board size.
    this.level += 1;
    return { observation: (this.obs = this.publish('beat')), reward: this.level, done: false };
  }

  /**
   * Deal `level` numbers (HB's kT): every number gets a *random* empty cell, so
   * value order never leaks reading order — clicking occupied cards top-to-bottom,
   * left-to-right would otherwise always be correct and the test trivial.
   */
  private deal(): void {
    const board: (number | null)[] = new Array(COLS * ROWS).fill(null);
    for (let value = 1; value <= this.level; ) {
      const cell = randomInt(this.rng, COLS * ROWS);
      if (board[cell] === null) {
        board[cell] = value;
        value += 1;
      }
    }
    this.cards = [];
    for (let cell = 0; cell < COLS * ROWS; cell++) {
      const value = board[cell];
      if (value !== null) this.cards.push({ cell, value, cleared: false });
    }
    this.numbersVisible = true; // HB newBoard: hideNumbers = false
    this.expected = 1;
    this.correct = null;
    this.obs = this.publish('play');
  }

  private publish(phase: ChimpTestPhase): ChimpTestObservation {
    this.obs = {
      phase,
      level: this.level,
      cols: COLS,
      rows: ROWS,
      strikes: this.strikes,
      cards: this.cards.map((c) => ({ ...c })),
      numbersVisible: this.numbersVisible,
      expected: this.expected,
      correct: this.correct,
      score: this.isDone ? this.finalScore : null,
    };
    return this.obs;
  }
}
