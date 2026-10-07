import type { Presence, ZoneOccupancy } from '@concordance/api-client';
import { Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    <Alert
      role="status"
      className="shift bg-secondary items-center rounded-none border-x-0 border-t-0 [&>svg]:translate-y-0"
    >
      <Clock />
      <AlertDescription className="text-foreground flex flex-wrap items-center justify-between gap-2">
        <span>
          En shift sur <strong className="font-heading text-base">{zone?.name ?? '…'}</strong>{' '}
          depuis {hhmm(shift.startedAt)}
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
      </AlertDescription>
    </Alert>
  );
}
