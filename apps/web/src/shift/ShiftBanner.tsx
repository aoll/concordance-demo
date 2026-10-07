import type { Presence, ZoneOccupancy } from '@concordance/api-client';
import { Button } from '@/components/ui/button';

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface ShiftBannerProps {
  shift: Presence;
  zone: ZoneOccupancy | undefined;
  busy: boolean;
  onEnd: () => void;
}

/** Bandeau « En shift sur … » toujours visible, avec la fin de shift. */
export function ShiftBanner({ shift, zone, busy, onEnd }: ShiftBannerProps) {
  return (
    <div
      className="shift bg-secondary flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-sm"
      role="status"
    >
      <span>
        En shift sur <strong className="font-heading text-base">{zone?.name ?? '…'}</strong> depuis{' '}
        {hhmm(shift.startedAt)}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="border-primary text-primary"
        onClick={onEnd}
        disabled={busy}
      >
        Terminer mon shift
      </Button>
    </div>
  );
}
