import {
  type ServerToClientEvents,
  ZONE_OCCUPANCY_UPDATED,
  type ZoneOccupancyUpdated,
  ZoneOccupancyUpdatedSchema,
} from '@concordance/contracts';
import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

/**
 * Real-time broadcast of zone occupancy (socket.io, on the API port).
 * Read-only and public, like `GET /zones`. A single instance here; with several
 * instances, we would plug in socket.io's Redis adapter to share broadcasts.
 */
@WebSocketGateway({ cors: false })
export class PresenceGateway {
  private readonly logger = new Logger(PresenceGateway.name);

  @WebSocketServer()
  private readonly server?: Server<Record<string, never>, ServerToClientEvents>;

  /** Called after the commit: an event validated by the shared contract, sent to everyone. */
  broadcast(event: ZoneOccupancyUpdated): void {
    // Without an HTTP server (contract export), the gateway is not mounted: nothing to broadcast.
    if (!this.server) return;
    this.server.emit(ZONE_OCCUPANCY_UPDATED, ZoneOccupancyUpdatedSchema.parse(event));
    this.logger.debug(`${event.change.kind} ${event.zone.name} → ${event.zone.occupied}`);
  }
}
