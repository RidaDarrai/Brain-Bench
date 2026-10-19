/**
 * Shared types for game environments.
 *
 * Every game in Brain Bench is modeled as a Gym-style environment:
 *  - `reset()` starts a new episode
 *  - `tick(dtMs)` advances internal timers (frame-based, like Atari emulators)
 *  - `step(action)` applies a player/agent action
 *
 * Each call returns a `StepResult` with a fresh observation, a reward signal,
 * and a `done` flag — so both humans (via React) and future RL agents can
 * drive the exact same code.
 */

export interface StepResult<O> {
  observation: O;
  reward: number;
  done: boolean;
}

export interface GameEnv<O, A> {
  /** Current observation (immutable snapshot). */
  readonly observation: O;
  /** Whether the current episode has ended. */
  readonly done: boolean;
  /** Start a new episode. */
  reset(): StepResult<O>;
  /** Advance internal timers by dtMs milliseconds. */
  tick(dtMs: number): StepResult<O>;
  /** Apply an action. Ignored if the episode is done. */
  step(action: A): StepResult<O>;
  /** Final score once `done`, otherwise null. */
  score(): number | null;
}
