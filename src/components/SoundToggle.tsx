import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isMuted, subscribeSound, toggleSound } from '../sound';

export default function SoundToggle() {
  const muted = useSyncExternalStore(subscribeSound, isMuted);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-[var(--muted-foreground)]"
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={!muted}
      onClick={toggleSound}
    >
      {muted ? (
        <VolumeX data-testid="sound-icon-off" />
      ) : (
        <Volume2 data-testid="sound-icon-on" />
      )}
    </Button>
  );
}
