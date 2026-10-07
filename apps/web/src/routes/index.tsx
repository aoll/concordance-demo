import { type Manager, useListZones } from '@concordance/api-client';
import { ZoneSlugSchema } from '@concordance/contracts';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { LiveBadge, LiveFeed } from '../live/LiveFeed';
import { useLiveZones } from '../live/useLiveZones';
import { ZoneMap } from '../map/ZoneMap';
import { useSession } from '../session/useSession';
import { isOptimistic } from '../shift/cache';
import { errorMessage } from '../shift/errors';
import { ShiftBanner } from '../shift/ShiftBanner';
import { useMyShift, useShiftMutations } from '../shift/useShift';
import { FILL_KEYS, fillLabel } from '../zones/fill';
import { ZonePanel } from '../zones/ZonePanel';

// La zone sélectionnée vit dans l'URL (?zone=la-defense) : partageable et conservée au rechargement.
export const Route = createFileRoute('/')({
  validateSearch: z.object({ zone: ZoneSlugSchema.optional().catch(undefined) }),
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
  const { zone: selectedSlug } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Des données (même restaurées hors ligne) priment sur une erreur de refetch.
  if (!zones.data) {
    return zones.isError ? (
      <p className="err page-error" role="alert">
        Impossible de charger les zones.
      </p>
    ) : (
      <p className="loading">Chargement des zones…</p>
    );
  }

  const shiftZone = zones.data.find((zone) => zone.id === shift?.zoneId);
  const selected =
    zones.data.find((zone) => zone.slug === selectedSlug) ?? shiftZone ?? zones.data[0];
  // Une fin de shift sur une présence encore provisoire n'aurait pas d'id serveur.
  const busy = join.isPending || end.isPending || (shift ? isOptimistic(shift) : false);
  const error = join.isError
    ? errorMessage(join.error)
    : end.isError
      ? errorMessage(end.error)
      : undefined;

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
            selected={selected?.slug}
            flashing={live.flashing}
            onSelect={(zone) => {
              join.reset();
              end.reset();
              void navigate({ search: { zone }, replace: true });
            }}
          />
          <div className="legend">
            {FILL_KEYS.map((key) => (
              <span key={key}>
                <i className={`sw fill-${key}`} />
                {fillLabel(key)}
              </span>
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
            error={error}
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
