import {
  getListPresencesQueryKey,
  getListZonesQueryKey,
  type Manager,
  type ZoneOccupancy,
} from '@concordance/api-client';
import { ZoneOccupancyUpdatedSchema, type ZoneSlug } from '@concordance/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type FeedEntry, feedEntry, withZoneSnapshot } from './apply';
import { type LiveStatus, subscribeLive } from './source';

const FEED_SIZE = 8;
const FLASH_MS = 900;

/**
 * Temps réel : chaque `zone.occupancy.updated` est validé par le schéma partagé puis écrit
 * directement dans le cache TanStack Query (`setQueryData`), sans refetch. La carte, le panneau
 * et le bandeau suivent puisqu'ils lisent ce cache. Après une coupure, on refetch une fois pour
 * rattraper les événements manqués.
 */
export function useLiveZones(me: Manager) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [flashing, setFlashing] = useState<ReadonlySet<ZoneSlug>>(new Set());

  useEffect(() => {
    const zonesKey = getListZonesQueryKey();
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const flash = (slug: ZoneSlug) => {
      setFlashing((current) => new Set(current).add(slug));
      const timer = setTimeout(() => {
        timers.delete(timer);
        setFlashing((current) => {
          const next = new Set(current);
          next.delete(slug);
          return next;
        });
      }, FLASH_MS);
      timers.add(timer);
    };

    const unsubscribe = subscribeLive({
      onEvent: (raw) => {
        const parsed = ZoneOccupancyUpdatedSchema.safeParse(raw);
        if (!parsed.success) return; // Contrat non respecté : on ignore plutôt que corrompre le cache.
        const event = parsed.data;
        queryClient.setQueryData<ZoneOccupancy[]>(zonesKey, (zones) =>
          withZoneSnapshot(zones, event.zone),
        );
        // Mon propre shift a changé ailleurs (autre onglet, autre appareil) : on relit ma présence.
        if (event.change.manager.id === me.id) {
          void queryClient.invalidateQueries({
            queryKey: getListPresencesQueryKey({ managerId: me.id, active: 'true' }),
          });
        }
        setFeed((current) => [feedEntry(event, me.id), ...current].slice(0, FEED_SIZE));
        flash(event.zone.slug);
      },
      onStatus: (next, reconnected) => {
        setStatus(next);
        if (reconnected) void queryClient.invalidateQueries({ queryKey: zonesKey });
      },
    });

    return () => {
      unsubscribe();
      for (const timer of timers) clearTimeout(timer);
    };
  }, [queryClient, me.id]);

  return { status, feed, flashing };
}
