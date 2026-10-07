import type { Manager, Presence, ZoneOccupancy } from '@concordance/api-client';

/**
 * Mises à jour du cache TanStack Query appliquées avant la réponse du serveur (optimisme).
 * Fonctions pures : la mutation les applique dans onMutate et restaure l'instantané sur erreur.
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

/** Présence provisoire affichée tant que le serveur n'a pas répondu (id remplacé au refetch). */
export function optimisticPresence(managerId: string, zoneId: string, now = new Date()): Presence {
  return {
    id: `optimistic-${now.getTime()}`,
    managerId,
    zoneId,
    startedAt: now.toISOString(),
    endedAt: null,
  };
}

export const isOptimistic = (presence: Presence) => presence.id.startsWith('optimistic-');
