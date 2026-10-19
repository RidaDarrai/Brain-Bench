# Brain Bench

A browser-based suite of cognitive tests inspired by Human Benchmark — but local-first:

- **No accounts, no leaderboards.** Your progress lives in your browser's `localStorage`, with JSON export/import.
- **Level progression** for Number Memory, Visual Memory, Chimp Test, and Aim Trainer: pass a level to unlock the next one.
- **RL-ready architecture.** Every game's logic lives in `src/core/` as a pure TypeScript environment with a Gym-style API (`reset()` / `tick(dt)` / `step(action)`), independent of React and the DOM. In the future, reinforcement learning agents can drive the exact same environments (headless in Node, or bridged to Python).

## The tests

| Test | Levels | Measures |
|------|--------|----------|
| Reaction Time | – | Visual reflex speed (avg of 5 rounds, ms) |
| Sequence Memory | – | Working memory (growing tile sequence) |
| Number Memory | ✅ | Digit span (level N = N digits) |
| Visual Memory | ✅ | Spatial recall (growing grids) |
| Chimp Test | ✅ | Eidetic number recall under time pressure |
| Aim Trainer | ✅ | Visuomotor speed & precision (Fitts's Law) |

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
```

## Project layout

```
src/
├── core/        # Pure TS game environments (no React, no DOM) — RL-ready
├── games/       # React components that render an env & map input to actions
├── pages/       # Home, Test, Progress pages
├── storage/     # localStorage progress + JSON export/import
└── components/  # Shared UI
```
