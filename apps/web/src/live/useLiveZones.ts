import {
  getListPresencesQueryKey,
  getListZonesQueryKey,
  type Manager,
  type ZoneOccupancy,
} from '@concordance/api-client';
import { ZoneOccupancyUpdatedSchema } from '@concordance/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type FeedEntry, feedEntry, withZoneSnapshot } from './apply';
import { type LiveStatus, subscribeLive } from './source';

const FEED_SIZE = 8;
const FLASH_MS = 900;

/**
 * Real time: each `zone.occupancy.updated` is validated by the shared schema then written
 * directly into the TanStack Query cache (`setQueryData`), without a refetch. The map, the panel
 * and the banner follow since they read this cache. After a disconnection, we refetch once to
 * catch up on missed events.
 */
export function useLiveZones(me: Manager) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [flashing, setFlashing] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const zonesKey = getListZonesQueryKey();
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const flash = (zoneId: string) => {
      setFlashing((current) => new Set(current).add(zoneId));
      const timer = setTimeout(() => {
        timers.delete(timer);
        setFlashing((current) => {
          const next = new Set(current);
          next.delete(zoneId);
          return next;
        });
      }, FLASH_MS);
      timers.add(timer);
    };

    const unsubscribe = subscribeLive({
      onEvent: (raw) => {
        const parsed = ZoneOccupancyUpdatedSchema.safeParse(raw);
        if (!parsed.success) return; // Contract violated: ignore rather than corrupt the cache.
        const event = parsed.data;
        queryClient.setQueryData<ZoneOccupancy[]>(zonesKey, (zones) =>
          withZoneSnapshot(zones, event.zone),
        );
        // My own shift changed elsewhere (another tab, another device): re-read my presence.
        if (event.change.manager.id === me.id) {
          void queryClient.invalidateQueries({
            queryKey: getListPresencesQueryKey({ managerId: me.id, active: 'true' }),
          });
        }
        setFeed((current) => [feedEntry(event, me.id), ...current].slice(0, FEED_SIZE));
        flash(event.zone.id);
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
