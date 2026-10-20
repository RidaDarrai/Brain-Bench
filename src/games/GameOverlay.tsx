import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';

interface GameOverlayProps {
  title: string;
  message?: ReactNode;
  accent?: 'good' | 'bad' | 'neutral';
  onContinue: () => void;
  continueLabel?: string;
}

/** Uniform end-of-run overlay shown by every game before reporting its result. */
export default function GameOverlay({
  title,
  message,
  accent = 'neutral',
  onContinue,
  continueLabel = 'Continue',
}: GameOverlayProps) {
  const titleColor =
    accent === 'good'
      ? 'text-[var(--success)]'
      : accent === 'bad'
        ? 'text-[var(--danger)]'
        : 'text-foreground';

  return (
    <div className="game-overlay" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-7 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]">
        <h2 className={cn('text-xl font-bold tracking-tight', titleColor)}>{title}</h2>
        {message && (
          <div className="mt-2.5 text-sm text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
            {message}
          </div>
        )}
        <Button className="mt-5 w-full" onClick={onContinue} autoFocus>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
