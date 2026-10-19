import { createRng, randomInt, type Rng } from './rng';
import type { GameEnv, StepResult } from './types';

/**
 * Sequence Memory — no levels, self-escalating (like the original).
 * A 3x3 grid flashes a growing sequence; repeat it. One mistake ends the run.
 * Score = the level (sequence length) you reached.
 */
export type SequenceMemoryPhase = 'show' | 'input' | 'done';

export interface SequenceMemoryObservation {
  phase: SequenceMemoryPhase;
  /** Current level = current sequence length. */
  level: number;
  /** The full sequence of tile indices (0..8). */
  sequence: number[];
  /** Index within the sequence currently being shown (-1 when idle). */
  showIndex: number;
  /** Whether the shown tile is lit right now. */
  showActive: boolean;
  /** How many correct presses so far this round. */
  inputIndex: number;
  score: number | null;
}

export interface SequenceMemoryAction {
  type: 'press';
  tile: number;
}

const GRID_TILES = 9;
const SHOW_ON_MS = 350;
const SHOW_GAP_MS = 250;
const SHOW_CYCLE = SHOW_ON_MS + SHOW_GAP_MS;

export class SequenceMemoryEnv
  implements GameEnv<SequenceMemoryObservation, SequenceMemoryAction>
{
  private rng: Rng;
  private obs: SequenceMemoryObservation;
  private isDone = false;
  private finalScore: number | null = null;
  private sequence: number[] = [];
  private showElapsed = 0;
  private inputIndex = 0;

  constructor(seed?: number) {
    this.rng = createRng(seed);
    this.sequence = [randomInt(this.rng, GRID_TILES)];
    this.obs = this.publish('show');
  }

  get observation(): SequenceMemoryObservation {
    return this.obs;
  }

  get done(): boolean {
    return this.isDone;
  }

  score(): number | null {
    return this.isDone ? this.finalScore : null;
  }

  reset(): StepResult<SequenceMemoryObservation> {
    this.isDone = false;
    this.finalScore = null;
    this.sequence = [randomInt(this.rng, GRID_TILES)];
    this.showElapsed = 0;
    this.inputIndex = 0;
    return { observation: (this.obs = this.publish('show')), reward: 0, done: false };
  }

  tick(dtMs: number): StepResult<SequenceMemoryObservation> {
    if (this.obs.phase !== 'show') {
      return { observation: this.obs, reward: 0, done: this.isDone };
    }
    this.showElapsed += dtMs;
    const idx = Math.floor(this.showElapsed / SHOW_CYCLE);
    if (idx >= this.sequence.length) {
      // Done showing — player's turn.
      return { observation: (this.obs = this.publish('input')), reward: 0, done: false };
    }
    const showActive = this.showElapsed % SHOW_CYCLE < SHOW_ON_MS;
    return {
      observation: (this.obs = this.publish('show', idx, showActive)),
      reward: 0,
      done: false,
    };
  }

  step(action: SequenceMemoryAction): StepResult<SequenceMemoryObservation> {
    if (action.type !== 'press' || this.isDone || this.obs.phase !== 'input') {
      return { observation: this.obs, reward: 0, done: this.isDone };
    }
    const expected = this.sequence[this.inputIndex];
    if (action.tile !== expected) {
      this.isDone = true;
      this.finalScore = this.sequence.length;
      return { observation: (this.obs = this.publish('done')), reward: -1, done: true };
    }
    this.inputIndex += 1;
    if (this.inputIndex >= this.sequence.length) {
      // Round complete — extend the sequence and show it again.
      this.sequence.push(randomInt(this.rng, GRID_TILES));
      this.showElapsed = 0;
      this.inputIndex = 0;
      return { observation: (this.obs = this.publish('show')), reward: 1, done: false };
    }
    return { observation: (this.obs = this.publish('input')), reward: 1, done: false };
  }

  private publish(
    phase: SequenceMemoryPhase,
    showIndex = -1,
    showActive = false,
  ): SequenceMemoryObservation {
    this.obs = {
      phase,
      level: this.sequence.length,
      sequence: [...this.sequence],
      showIndex,
      showActive,
      inputIndex: this.inputIndex,
      score: this.isDone ? this.finalScore : null,
    };
    return this.obs;
  }
}
