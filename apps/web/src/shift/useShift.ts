import {
  type ErrorResponse,
  type ErrorType,
  getListPresencesQueryKey,
  getListZonesQueryKey,
  type Manager,
  type Presence,
  useCreatePresence,
  useListPresences,
  useUpdatePresence,
  type ZoneOccupancy,
} from '@concordance/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { optimisticPresence, withJoined, withLeft } from './cache';

const myShiftParams = (managerId: string) => ({ managerId, active: 'true' as const });

/** Le shift en cours du manager connecté (au plus un : règle métier côté API). */
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
 * Inscription et fin de shift en mise à jour optimiste : le cache change avant la réponse,
 * l'instantané est restauré si l'API refuse (409 ZONE_FULL…), puis on resynchronise.
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

  const end = useUpdatePresence<ShiftError, Snapshot>({
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
