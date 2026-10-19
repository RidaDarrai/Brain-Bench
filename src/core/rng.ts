/** Small seeded PRNG (mulberry32) so episodes are reproducible for RL/debugging. */
export type Rng = () => number;

export function createRng(seed?: number): Rng {
  let a = (seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [0, maxExclusive). */
export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** `count` distinct integers in [0, maxExclusive), sorted. */
export function distinctInts(rng: Rng, maxExclusive: number, count: number): number[] {
  const pool = Array.from({ length: maxExclusive }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}
