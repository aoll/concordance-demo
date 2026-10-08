import type { Manager, Presence, ZoneOccupancy } from '@concordance/api-client';

/**
 * TanStack Query cache updates applied before the server responds (optimistic).
 * Pure functions: the mutation applies them in onMutate and restores the snapshot on error.
 */
export function withJoined(
  zones: ZoneOccupancy[] | undefined,
  zoneId: string,
  manager: Manager,
): ZoneOccupancy[] | undefined {
  return zones?.map((zone) =>
    zone.id === zoneId
      ? { ...zone, occupied: zone.occupied + 1, managers: [...zone.managers, manager] }
      : zone,
  );
}

export function withLeft(
  zones: ZoneOccupancy[] | undefined,
  zoneId: string,
  managerId: string,
): ZoneOccupancy[] | undefined {
  return zones?.map((zone) =>
    zone.id === zoneId && zone.managers.some((m) => m.id === managerId)
      ? {
          ...zone,
          occupied: zone.occupied - 1,
          managers: zone.managers.filter((m) => m.id !== managerId),
        }
      : zone,
  );
}

/** Provisional presence shown until the server responds (id replaced on refetch). */
export function optimisticPresence(managerId: string, zoneId: string, now = new Date()): Presence {
  return {
    id: `optimistic-${now.getTime()}`,
    managerId,
    zoneId,
    startedAt: now.toISOString(),
    endedAt: null,
    status: 'ACTIVE',
  };
}

export const isOptimistic = (presence: Presence) => presence.id.startsWith('optimistic-');
