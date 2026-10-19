import type { ReactNode } from 'react';

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
  return (
    <div className={`game-overlay accent-${accent}`} role="dialog" aria-modal="true">
      <div className="game-overlay-card">
        <h2>{title}</h2>
        {message && <div className="game-overlay-message">{message}</div>}
        <button className="btn btn-primary" onClick={onContinue} autoFocus>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
