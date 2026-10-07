import { z } from 'zod';
import { ZoneShapeSchema } from './zones';

/**
 * Événements WebSocket (socket.io) émis par l'API après chaque commit d'inscription ou de fin
 * de shift. OpenAPI ne décrit pas le WebSocket : ce schéma Zod est le contrat, importé par la
 * gateway Nest et par le front. Il reprend la forme de `ZoneOccupancy` du contrat REST, pour
 * que le front remplace la zone dans le cache de `GET /zones` sans refetch.
 */
export const ZONE_OCCUPANCY_UPDATED = 'zone.occupancy.updated';

export const ManagerRefSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
});

export const ZoneSnapshotSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  capacity: z.int().positive(),
  shape: ZoneShapeSchema,
  occupied: z.int().nonnegative(),
  managers: z.array(ManagerRefSchema),
});

export const ZoneOccupancyUpdatedSchema = z.object({
  /** Occupation complète de la zone après le changement : appliquer l'événement est idempotent. */
  zone: ZoneSnapshotSchema,
  /** Ce qui vient de se passer, pour le fil d'activité. */
  change: z.object({
    kind: z.enum(['joined', 'left']),
    manager: ManagerRefSchema,
  }),
  at: z.iso.datetime(),
});

export type ZoneSnapshot = z.infer<typeof ZoneSnapshotSchema>;
export type ZoneOccupancyUpdated = z.infer<typeof ZoneOccupancyUpdatedSchema>;

/** Typage socket.io des deux côtés : `Server<{}, ServerToClientEvents>` et `Socket<ServerToClientEvents>`. */
export interface ServerToClientEvents {
  [ZONE_OCCUPANCY_UPDATED]: (event: ZoneOccupancyUpdated) => void;
}
