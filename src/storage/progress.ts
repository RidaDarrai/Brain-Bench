import { TESTS, type TestId } from '../core/tests';

/**
 * Progress persistence: localStorage + JSON export/import.
 *
 * Shape is versioned so we can migrate later without losing player data.
 */

export const STORAGE_KEY = 'brainbench:progress:v1';
export const PROGRESS_VERSION = 1;

export interface LevelRecord {
  /** Whether the player has passed this level at least once. */
  passed: boolean;
  attempts: number;
}

export interface TestProgress {
  /** Best score across all runs of this test, or null if never finished. */
  bestScore: number | null;
  /** Highest level the player has passed (+1 = next unlocked level). */
  highestUnlockedLevel: number;
  /** Per-level bests, keyed by level number. */
  levels: Record<number, LevelRecord>;
}

export interface Progress {
  version: number;
  tests: Partial<Record<TestId, TestProgress>>;
}

export interface RunOutcome {
  progress: Progress;
  newBest: boolean;
  /** Levels that became newly unlocked because of this run. */
  newlyUnlocked: number[];
  /** The (new) highest unlocked level after this run. */
  unlockedLevel: number;
}

function emptyTestProgress(meta: { hasLevels: boolean; defaultStartLevel: number }): TestProgress {
  return {
    bestScore: null,
    highestUnlockedLevel: meta.defaultStartLevel,
    levels: {},
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: PROGRESS_VERSION, tests: {} };
    return validateProgress(JSON.parse(raw));
  } catch {
    return { version: PROGRESS_VERSION, tests: {} };
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/** Validate an untrusted object (e.g. an imported file) into a Progress. */
export function validateProgress(data: unknown): Progress {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Not a valid progress file.');
  }
  const raw = data as { version?: unknown; tests?: unknown };
  if (raw.version !== PROGRESS_VERSION) {
    throw new Error(`Unsupported progress file version: ${String(raw.version)}`);
  }
  if (typeof raw.tests !== 'object' || raw.tests === null) {
    throw new Error('Progress file is missing the "tests" section.');
  }
  const tests: Progress['tests'] = {};
  for (const [id, entry] of Object.entries(raw.tests as Record<string, unknown>)) {
    if (!(id in TESTS) || typeof entry !== 'object' || entry === null) continue;
    const t = entry as Record<string, unknown>;
    const meta = TESTS[id as TestId];
    const levels: Record<number, LevelRecord> = {};
    if (typeof t.levels === 'object' && t.levels !== null) {
      for (const [lvl, rec] of Object.entries(t.levels as Record<string, unknown>)) {
        const r = rec as Record<string, unknown>;
        const level = Number(lvl);
        if (Number.isInteger(level) && level >= 1 && typeof r.attempts === 'number') {
          levels[level] = { passed: r.passed === true, attempts: r.attempts };
        }
      }
    }
    tests[id as TestId] = {
      bestScore: typeof t.bestScore === 'number' && Number.isFinite(t.bestScore) ? t.bestScore : null,
      highestUnlockedLevel:
        typeof t.highestUnlockedLevel === 'number' && t.highestUnlockedLevel >= 1
          ? Math.floor(t.highestUnlockedLevel)
          : meta.defaultStartLevel,
      levels,
    };
  }
  return { version: PROGRESS_VERSION, tests };
}

/**
 * Record the result of one finished run and persist it.
 *
 * @param score    the run's score (direction depends on the test)
 * @param cleared  levels actually passed during this run (empty for non-leveled tests)
 * Returns the updated progress plus what changed (for the results screen).
 */
export function recordRun(testId: TestId, score: number, cleared: number[] = []): RunOutcome {
  const meta = TESTS[testId];
  const progress = loadProgress();
  const entry = progress.tests[testId] ?? emptyTestProgress(meta);

  const prevBest = entry.bestScore;
  const newBest =
    prevBest === null || (meta.lowerIsBetter ? score < prevBest : score > prevBest);

  const newlyUnlocked: number[] = [];
  if (meta.hasLevels) {
    const sorted = [...new Set(cleared)].filter((l) => Number.isInteger(l) && l >= 1).sort((a, b) => a - b);
    for (const level of sorted) {
      const record = entry.levels[level];
      if (record) {
        record.attempts += 1;
        record.passed = true;
      } else {
        entry.levels[level] = { passed: true, attempts: 1 };
      }
      if (level >= 1 && level + 1 > entry.highestUnlockedLevel && level + 1 <= meta.maxLevel) {
        entry.highestUnlockedLevel = level + 1;
        newlyUnlocked.push(level + 1);
      }
      if (level > entry.highestUnlockedLevel) entry.highestUnlockedLevel = level;
    }
    // Never unlock beyond the cap.
    entry.highestUnlockedLevel = Math.min(entry.highestUnlockedLevel, meta.maxLevel);
  }

  if (newBest) entry.bestScore = score;
  progress.tests[testId] = entry;
  saveProgress(progress);

  return {
    progress,
    newBest,
    newlyUnlocked,
    unlockedLevel: entry.highestUnlockedLevel,
  };
}

/** Download the full progress as a JSON file. */
export function exportProgress(): void {
  const progress = loadProgress();
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `brainbench-progress-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse + validate imported JSON text, save it, and return the new progress. */
export function importProgress(json: string): Progress {
  const progress = validateProgress(JSON.parse(json));
  saveProgress(progress);
  return progress;
}

/** Wipe all saved progress. */
export function clearProgress(): Progress {
  const fresh: Progress = { version: PROGRESS_VERSION, tests: {} };
  saveProgress(fresh);
  return fresh;
}
