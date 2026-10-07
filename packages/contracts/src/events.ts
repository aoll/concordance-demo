import { z } from 'zod';
import { ZoneShapeSchema } from './zones';

/**
 * WebSocket (socket.io) events emitted by the API after each sign-up or shift-end
 * commit. OpenAPI does not describe the WebSocket: this Zod schema is the contract, imported by the
 * Nest gateway and by the front end. It mirrors the shape of `ZoneOccupancy` from the REST contract, so
 * that the front end replaces the zone in the `GET /zones` cache without a refetch.
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
  /** Full occupancy of the zone after the change: applying the event is idempotent. */
  zone: ZoneSnapshotSchema,
  /** What just happened, for the activity feed. */
  change: z.object({
    kind: z.enum(['joined', 'left']),
    manager: ManagerRefSchema,
  }),
  at: z.iso.datetime(),
});

export type ZoneSnapshot = z.infer<typeof ZoneSnapshotSchema>;
export type ZoneOccupancyUpdated = z.infer<typeof ZoneOccupancyUpdatedSchema>;

/** socket.io typing on both sides: `Server<{}, ServerToClientEvents>` and `Socket<ServerToClientEvents>`. */
export interface ServerToClientEvents {
  [ZONE_OCCUPANCY_UPDATED]: (event: ZoneOccupancyUpdated) => void;
}
