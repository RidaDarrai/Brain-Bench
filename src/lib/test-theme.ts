import type { CSSProperties } from 'react';
import { Brain, Eye, Hash, Puzzle, Target, Zap, type LucideIcon } from 'lucide-react';
import type { TestId } from '@/core/tests';

/** Lucide icon per test — web-layer presentation, core stays React-free. */
export const TEST_ICONS: Record<TestId, LucideIcon> = {
  'reaction-time': Zap,
  'sequence-memory': Puzzle,
  'number-memory': Hash,
  'visual-memory': Eye,
  'chimp-test': Brain,
  'aim-trainer': Target,
};

/** Per-test neon accent; token values live in src/index.css. */
export const TEST_ACCENTS: Record<TestId, string> = {
  'reaction-time': 'var(--test-reaction)',
  'sequence-memory': 'var(--test-sequence)',
  'number-memory': 'var(--test-number)',
  'visual-memory': 'var(--test-visual)',
  'chimp-test': 'var(--test-chimp)',
  'aim-trainer': 'var(--test-aim)',
};

/** Exposes the test's accent as `--test-accent` for Tailwind arbitrary values. */
export function testAccentStyle(id: TestId): CSSProperties {
  return { '--test-accent': TEST_ACCENTS[id] } as CSSProperties;
}
