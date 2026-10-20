import type { TestId } from '@/core/tests';
import { TEST_ICONS } from '@/lib/test-theme';

/** Renders a test's Lucide icon. */
export default function TestIcon({ id, className }: { id: TestId; className?: string }) {
  const Icon = TEST_ICONS[id];
  return <Icon className={className} aria-hidden="true" />;
}
