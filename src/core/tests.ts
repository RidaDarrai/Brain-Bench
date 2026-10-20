/** Central metadata for all tests: ids, level rules, scoring direction, copy. */

export type TestId =
  | 'reaction-time'
  | 'sequence-memory'
  | 'number-memory'
  | 'visual-memory'
  | 'chimp-test'
  | 'aim-trainer';

export interface TestMeta {
  id: TestId;
  name: string;
  /** Lucide icon name (presentation mapped in src/lib/test-theme.ts). */
  icon: string;
  tagline: string;
  description: string;
  /** Whether this test has unlockable levels. */
  hasLevels: boolean;
  /** Highest level (only meaningful for leveled tests). */
  maxLevel: number;
  /** Lower scores are better for reaction/aim time. */
  lowerIsBetter: boolean;
  /** Default level the Chimp Test starts at. */
  defaultStartLevel: number;
  instructions: string[];
}

export const TESTS: Record<TestId, TestMeta> = {
  'reaction-time': {
    id: 'reaction-time',
    name: 'Reaction Time',
    icon: 'zap',
    tagline: 'Test your visual reflexes.',
    description:
      'Click as soon as the screen turns green. 5 rounds — your score is the average time in milliseconds.',
    hasLevels: false,
    maxLevel: 0,
    lowerIsBetter: true,
    defaultStartLevel: 1,
    instructions: [
      'Click once to start each round.',
      'Wait for the red screen to turn green, then click as fast as you can.',
      'Clicking too early restarts the round.',
      'Your score is the average of 5 rounds (lower is better).',
    ],
  },
  'sequence-memory': {
    id: 'sequence-memory',
    name: 'Sequence Memory',
    icon: 'puzzle',
    tagline: 'Repeat an increasingly long pattern.',
    description:
      'Watch the tiles light up, then press them back in the same order. Each round adds one more step. One mistake ends the run.',
    hasLevels: false,
    maxLevel: 0,
    lowerIsBetter: false,
    defaultStartLevel: 1,
    instructions: [
      'A 3x3 grid will flash a sequence of tiles.',
      'After it finishes, press the tiles in exactly the same order.',
      'Each successful round makes the sequence one step longer.',
      'Your score is the level (sequence length) you reach.',
    ],
  },
  'number-memory': {
    id: 'number-memory',
    name: 'Number Memory',
    icon: 'hash',
    tagline: 'How many digits can you hold?',
    description:
      'A number appears for a few seconds — type it back from memory. Pass a level to unlock the next one. Level N has N digits.',
    hasLevels: true,
    maxLevel: 30,
    lowerIsBetter: false,
    defaultStartLevel: 1,
    instructions: [
      'A number with as many digits as your level will be shown.',
      'Memorize it before the timer runs out.',
      'Type it back and press Enter (or the Submit button).',
      'Pass a level to unlock the next one.',
    ],
  },
  'visual-memory': {
    id: 'visual-memory',
    name: 'Visual Memory',
    icon: 'eye',
    tagline: 'Remember a pattern of squares.',
    description:
      'Squares light up on a grid — memorize which ones, then select them. The grid and the number of squares grow with each level.',
    hasLevels: true,
    maxLevel: 30,
    lowerIsBetter: false,
    defaultStartLevel: 1,
    instructions: [
      'Some squares on the grid will light up briefly.',
      'Memorize their positions.',
      'Click every lit square, then press Submit.',
      'Pass a level to unlock the next one (bigger grids, more squares).',
    ],
  },
  'chimp-test': {
    id: 'chimp-test',
    name: 'Chimp Test',
    icon: 'brain',
    tagline: 'Are you smarter than a chimpanzee?',
    description:
      'Numbers 1 to N appear on a grid. Click 1 and they all hide — then click the rest in order from memory. Beat a level to unlock a bigger one.',
    hasLevels: true,
    maxLevel: 20,
    lowerIsBetter: false,
    defaultStartLevel: 4,
    instructions: [
      'Numbers 1 to N are scattered on the grid.',
      'Click 1 first — all the numbers will hide.',
      'Now click 2, 3, 4… in ascending order from memory.',
      'Pass a level to unlock the next (one more number each level).',
    ],
  },
  'aim-trainer': {
    id: 'aim-trainer',
    name: 'Aim Trainer',
    icon: 'target',
    tagline: 'How fast can you hit all the targets?',
    description:
      'Click the targets as quickly as you can. Levels add targets, shrink them, and eventually add a time limit.',
    hasLevels: true,
    maxLevel: 15,
    lowerIsBetter: true,
    defaultStartLevel: 1,
    instructions: [
      'A target appears — click it as fast as you can.',
      'Hit every target to pass the level.',
      'Later levels: more targets, smaller targets, and a time limit.',
      'Your score is the average time per target (lower is better).',
    ],
  },
};

export const TEST_ORDER: TestId[] = [
  'reaction-time',
  'sequence-memory',
  'number-memory',
  'visual-memory',
  'chimp-test',
  'aim-trainer',
];

export function isTestId(value: string): value is TestId {
  return value in TESTS;
}

/** Human-readable score, e.g. "273 ms" or "12 levels". */
export function formatScore(meta: TestMeta, score: number | null | undefined): string {
  if (score === null || score === undefined) return '—';
  const rounded = meta.lowerIsBetter ? Math.round(score) : Math.floor(score);
  if (meta.lowerIsBetter) return `${rounded} ms`;
  return `${rounded} ${rounded === 1 ? 'level' : 'levels'}`;
}
