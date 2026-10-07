import { type Manager, useListZones } from '@concordance/api-client';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageSkeleton } from '@/components/PageSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LiveBadge, LiveFeed } from '../live/LiveFeed';
import { useLiveZones } from '../live/useLiveZones';
import { ZoneMap } from '../map/ZoneMap';
import { useOnline } from '../pwa/OfflineBanner';
import { useSession } from '../session/useSession';
import { isOptimistic } from '../shift/cache';
import { errorMessage } from '../shift/errors';
import { ShiftBanner } from '../shift/ShiftBanner';
import { useMyShift, useShiftMutations } from '../shift/useShift';
import { FILL_KEYS, fillLabel } from '../zones/fill';
import { ZoneList } from '../zones/ZoneList';
import { ZonePanel } from '../zones/ZonePanel';

// La zone sélectionnée vit dans l'URL (?zone=<id>, le même id que l'API) : partageable et
// conservée au rechargement. Un id mal formé est ignoré ; un id inconnu retombe sur une zone par défaut.
const SHIFT_ERROR = 'shift-error';

export const Route = createFileRoute('/')({
  validateSearch: z.object({ zone: z.uuid().optional().catch(undefined) }),
  component: MapPage,
});

function MapPage() {
  const { manager } = useSession();
  // La racine n'affiche cette page qu'une fois connecté.
  return manager ? <ZonesScreen me={manager} /> : null;
}

function ZonesScreen({ me }: { me: Manager }) {
  const zones = useListZones({ query: { staleTime: 30_000 } });
  const shift = useMyShift(me);
  const { join, end } = useShiftMutations(me);
  const live = useLiveZones(me);
  const online = useOnline();
  const { zone: selectedId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // Bottom sheet du téléphone : repliée sur la liste et le détail court, dépliée sur tout le panneau.
  const [sheetOpen, setSheetOpen] = useState(false);
  const { reset: resetJoin } = join;
  const { reset: resetEnd } = end;
  const dismissError = useCallback(() => {
    resetJoin();
    resetEnd();
  }, [resetJoin, resetEnd]);
  const error = join.isError
    ? errorMessage(join.error)
    : end.isError
      ? errorMessage(end.error)
      : undefined;

  // Erreurs des actions de shift (409 compris) : un toast qui se ferme seul ou au toucher.
  useEffect(() => {
    if (!error) {
      toast.dismiss(SHIFT_ERROR);
      return;
    }
    toast.error(error, {
      id: SHIFT_ERROR,
      testId: 'toast',
      duration: 6000,
      onDismiss: dismissError,
      onAutoClose: dismissError,
    });
  }, [error, dismissError]);

  // Des données (même restaurées hors ligne) priment sur une erreur de refetch.
  if (!zones.data) {
    return zones.isError ? (
      <Alert variant="destructive" className="m-4 w-auto">
        <AlertDescription>Impossible de charger les zones.</AlertDescription>
      </Alert>
    ) : (
      <PageSkeleton />
    );
  }

  const shiftZone = zones.data.find((zone) => zone.id === shift?.zoneId);
  const selected = zones.data.find((zone) => zone.id === selectedId) ?? shiftZone ?? zones.data[0];
  // Une fin de shift sur une présence encore provisoire n'aurait pas d'id serveur.
  // Hors ligne, les écritures échoueraient : les boutons d'inscription et de fin de shift sont coupés.
  const busy = !online || join.isPending || end.isPending || (shift ? isOptimistic(shift) : false);
  const select = (zone: string) => {
    dismissError();
    void navigate({ search: { zone }, replace: true });
  };

  const endShift = () => {
    if (shift) end.mutate({ id: shift.id, data: { status: 'ENDED' } });
  };

  return (
    <>
      {shift && <ShiftBanner shift={shift} zone={shiftZone} busy={busy} onEnd={endShift} />}
      <div className="app">
        <div className="mapbox">
          <ZoneMap
            zones={zones.data}
            selected={selected?.id}
            flashing={live.flashing}
            onSelect={select}
          />
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 px-1 pt-2 text-xs">
            {FILL_KEYS.map((key) => (
              <Badge key={key} variant="outline" className="text-muted-foreground font-normal">
                <i className={cn('bg-fill size-2.5 rounded-[3px]', `fill-${key}`)} />
                {fillLabel(key)}
              </Badge>
            ))}
            <LiveBadge status={live.status} />
          </div>
        </div>
        {selected && (
          <ZonePanel
            zone={selected}
            me={me}
            shift={shift}
            shiftZone={shiftZone}
            busy={busy}
            offline={!online}
            sheetOpen={sheetOpen}
            onToggleSheet={() => setSheetOpen((open) => !open)}
            list={<ZoneList zones={zones.data} selected={selected.id} onSelect={select} />}
            onJoin={() => join.mutate({ data: { zoneId: selected.id } })}
            onEnd={endShift}
          >
            <LiveFeed entries={live.feed} />
          </ZonePanel>
        )}
      </div>
    </>
  );
}
