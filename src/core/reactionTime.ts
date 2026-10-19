import { createRng, type Rng } from './rng';
import type { GameEnv, StepResult } from './types';

/**
 * Reaction Time — no levels, single continuous test.
 * Click when the screen turns green. 5 rounds, score = average time (ms).
 */
export type ReactionTimePhase = 'idle' | 'waiting' | 'green' | 'early' | 'result' | 'done';

export interface ReactionTimeObservation {
  phase: ReactionTimePhase;
  round: number;
  totalRounds: number;
  times: number[];
  lastTime: number | null;
  /** ms elapsed in the current waiting/green phase. */
  elapsed: number;
  /** Average reaction time over all rounds (only when done). */
  score: number | null;
}

export interface ReactionTimeAction {
  type: 'click';
}

const TOTAL_ROUNDS = 5;
const MIN_WAIT = 1500;
const MAX_WAIT = 4500;

export class ReactionTimeEnv implements GameEnv<ReactionTimeObservation, ReactionTimeAction> {
  private rng: Rng;
  private obs: ReactionTimeObservation;
  private isDone = false;
  private finalScore: number | null = null;
  private waitDuration = 0;
  private times: number[] = [];
  private lastTime: number | null = null;
  private elapsed = 0;

  constructor(seed?: number) {
    this.rng = createRng(seed);
    this.obs = this.publish('idle');
  }

  get observation(): ReactionTimeObservation {
    return this.obs;
  }

  get done(): boolean {
    return this.isDone;
  }

  score(): number | null {
    return this.isDone ? this.finalScore : null;
  }

  reset(): StepResult<ReactionTimeObservation> {
    this.isDone = false;
    this.finalScore = null;
    this.times = [];
    this.lastTime = null;
    this.elapsed = 0;
    return { observation: (this.obs = this.publish('idle')), reward: 0, done: false };
  }

  tick(dtMs: number): StepResult<ReactionTimeObservation> {
    const phase = this.obs.phase;
    if (phase !== 'waiting' && phase !== 'green') {
      return { observation: this.obs, reward: 0, done: this.isDone };
    }
    this.elapsed += dtMs;
    if (phase === 'waiting' && this.elapsed >= this.waitDuration) {
      // Green! Reset the clock so the measured time starts now.
      this.elapsed = 0;
      return { observation: (this.obs = this.publish('green')), reward: 0, done: false };
    }
    return { observation: (this.obs = this.publish(phase)), reward: 0, done: this.isDone };
  }

  step(action: ReactionTimeAction): StepResult<ReactionTimeObservation> {
    if (action.type !== 'click' || this.isDone) {
      return { observation: this.obs, reward: 0, done: this.isDone };
    }
    switch (this.obs.phase) {
      case 'idle':
        return this.startRound();
      case 'waiting':
        // Clicked before the light turned green — restart the round.
        this.elapsed = 0;
        return { observation: (this.obs = this.publish('early')), reward: -1, done: false };
      case 'early':
        return this.startRound();
      case 'green': {
        const time = this.elapsed;
        this.times.push(time);
        this.lastTime = time;
        this.elapsed = 0;
        if (this.times.length >= TOTAL_ROUNDS) {
          this.finalScore = this.times.reduce((a, b) => a + b, 0) / this.times.length;
          this.isDone = true;
          return {
            observation: (this.obs = this.publish('done')),
            reward: -time / 1000,
            done: true,
          };
        }
        return {
          observation: (this.obs = this.publish('result')),
          reward: -time / 1000,
          done: false,
        };
      }
      case 'result':
        return this.startRound();
      default:
        return { observation: this.obs, reward: 0, done: this.isDone };
    }
  }

  private startRound(): StepResult<ReactionTimeObservation> {
    this.waitDuration = MIN_WAIT + this.rng() * (MAX_WAIT - MIN_WAIT);
    this.elapsed = 0;
    return { observation: (this.obs = this.publish('waiting')), reward: 0, done: false };
  }

  private publish(phase: ReactionTimePhase): ReactionTimeObservation {
    this.obs = {
      phase,
      round: this.times.length + 1,
      totalRounds: TOTAL_ROUNDS,
      times: [...this.times],
      lastTime: this.lastTime,
      elapsed: Math.round(this.elapsed),
      score: this.isDone ? this.finalScore : null,
    };
    return this.obs;
  }
}
