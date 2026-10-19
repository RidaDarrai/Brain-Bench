import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { GameEnv } from '../core/types';

/**
 * Bridges a core environment to React:
 *  - runs a requestAnimationFrame loop calling env.tick(dt)
 *  - exposes env.observation (re-rendered only when its identity changes)
 *  - exposes act() to dispatch player actions
 *
 * The environment itself stays React-free — this is the only glue.
 */
export interface EnvBinding<O, A> {
  obs: O;
  act: (action: A) => void;
}

export function useEnv<O, A>(create: () => GameEnv<O, A>): EnvBinding<O, A> {
  const envRef = useRef<GameEnv<O, A> | null>(null);
  if (envRef.current === null) envRef.current = create();
  const env = envRef.current;
  const lastObs = useRef<O>(env.observation);
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(100, now - last); // clamp long tab-away deltas
      last = now;
      if (!env.done) env.tick(dt);
      if (lastObs.current !== env.observation) {
        lastObs.current = env.observation;
        force();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [env]);

  const act = useCallback(
    (action: A) => {
      if (env.done) return;
      const before = env.observation;
      env.step(action);
      if (lastObs.current !== env.observation) {
        lastObs.current = env.observation;
        force();
      } else if (before !== env.observation) {
        force();
      }
    },
    [env],
  );

  return { obs: env.observation, act };
}

/** Inclusive range helper: levelsBetween(4, 6) => [4, 5, 6]. */
export function levelsBetween(from: number, toInclusive: number): number[] {
  if (toInclusive < from) return [];
  return Array.from({ length: toInclusive - from + 1 }, (_, i) => from + i);
}
