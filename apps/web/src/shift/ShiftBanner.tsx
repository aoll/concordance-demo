import type { Presence, ZoneOccupancy } from '@concordance/api-client';

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
    <div className="shift" role="status">
      <span>
        En shift sur <strong>{zone?.name ?? '…'}</strong> depuis {hhmm(shift.startedAt)}
      </span>
      <button type="button" className="btn ghost" onClick={onEnd} disabled={busy}>
        Terminer mon shift
      </button>
    </div>
  );
}
