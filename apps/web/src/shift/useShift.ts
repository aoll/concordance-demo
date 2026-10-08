import {
  type ErrorResponse,
  type ErrorType,
  getListPresencesQueryKey,
  getListZonesQueryKey,
  type Manager,
  type Presence,
  useCreatePresence,
  useListPresences,
  useSetPresenceStatus,
  type ZoneOccupancy,
} from '@concordance/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { optimisticPresence, withJoined, withLeft } from './cache';

const myShiftParams = (managerId: string) => ({ managerId, active: 'true' as const });

/** The current shift of the signed-in manager (at most one: business rule on the API side). */
export function useMyShift(manager: Manager) {
  const presences = useListPresences(myShiftParams(manager.id));
  return presences.data?.[0];
}

type ShiftError = ErrorType<ErrorResponse>;

interface Snapshot {
  zones: ZoneOccupancy[] | undefined;
  presences: Presence[] | undefined;
}

/**
 * Shift sign-up and end as an optimistic update: the cache changes before the response,
 * the snapshot is restored if the API refuses (409 ZONE_FULL…), then we resync.
 */
export function useShiftMutations(manager: Manager) {
  const queryClient = useQueryClient();
  const zonesKey = getListZonesQueryKey();
  const presencesKey = getListPresencesQueryKey(myShiftParams(manager.id));

  const snapshot = async (): Promise<Snapshot> => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: zonesKey }),
      queryClient.cancelQueries({ queryKey: presencesKey }),
    ]);
    return {
      zones: queryClient.getQueryData<ZoneOccupancy[]>(zonesKey),
      presences: queryClient.getQueryData<Presence[]>(presencesKey),
    };
  };
  const restore = (previous: Snapshot | undefined) => {
    if (!previous) return;
    queryClient.setQueryData(zonesKey, previous.zones);
    queryClient.setQueryData(presencesKey, previous.presences);
  };
  const resync = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: zonesKey }),
      queryClient.invalidateQueries({ queryKey: presencesKey }),
    ]);

  const join = useCreatePresence<ShiftError, Snapshot>({
    mutation: {
      onMutate: async ({ data }) => {
        const previous = await snapshot();
        queryClient.setQueryData<ZoneOccupancy[]>(zonesKey, (zones) =>
          withJoined(zones, data.zoneId, manager),
        );
        queryClient.setQueryData<Presence[]>(presencesKey, [
          optimisticPresence(manager.id, data.zoneId),
        ]);
        return previous;
      },
      onError: (_error, _variables, previous) => restore(previous),
      onSettled: resync,
    },
  });

  const end = useSetPresenceStatus<ShiftError, Snapshot>({
    mutation: {
      onMutate: async ({ id }) => {
        const previous = await snapshot();
        const presence = previous.presences?.find((candidate) => candidate.id === id);
        if (presence) {
          queryClient.setQueryData<ZoneOccupancy[]>(zonesKey, (zones) =>
            withLeft(zones, presence.zoneId, manager.id),
          );
        }
        queryClient.setQueryData<Presence[]>(presencesKey, []);
        return previous;
      },
      onError: (_error, _variables, previous) => restore(previous),
      onSettled: resync,
    },
  });

  return { join, end };
}
