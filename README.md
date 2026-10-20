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

## Design

Cyberpunk "neon terminal" UI built with **Tailwind CSS v4 + shadcn/ui** (Radix), in two themes:

- **Dark (default)** — deep-black surfaces, neon cyan brand, per-test accent colors (reaction lime, sequence amber, number cyan, visual violet, chimp green, aim magenta), faint scanlines and a rare glitch-headline effect.
- **Light** — an "inverted phosphor" palette: paper background with darkened neon text variants (all ≥ 4.5:1).

Game play-fields stay instrument-dark in both themes. Fonts: Space Grotesk (UI) + JetBrains Mono (scores/HUD). All motion respects `prefers-reduced-motion`, focus-visible rings are keyboard-visible, and Lighthouse accessibility scores 100.

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
├── lib/         # Web-layer presentation maps (icons, per-test accents)
├── components/  # Shared UI + shadcn/ui primitives (src/components/ui)
└── index.css    # Design tokens (dark/light) + Tailwind entry
```
