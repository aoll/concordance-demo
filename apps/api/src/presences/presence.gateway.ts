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
 * Diffusion temps réel de l'occupation des zones (socket.io, sur le port de l'API).
 * Lecture seule et publique, comme `GET /zones`. Une seule instance ici ; à plusieurs
 * instances, on brancherait l'adapter Redis de socket.io pour partager les diffusions.
 */
@WebSocketGateway({ cors: false })
export class PresenceGateway {
  private readonly logger = new Logger(PresenceGateway.name);

  @WebSocketServer()
  private readonly server?: Server<Record<string, never>, ServerToClientEvents>;

  /** Appelé après le commit : un événement validé par le contrat partagé, envoyé à tous. */
  broadcast(event: ZoneOccupancyUpdated): void {
    // Sans serveur HTTP (export du contrat), la gateway n'est pas montée : rien à diffuser.
    if (!this.server) return;
    this.server.emit(ZONE_OCCUPANCY_UPDATED, ZoneOccupancyUpdatedSchema.parse(event));
    this.logger.debug(`${event.change.kind} ${event.zone.name} → ${event.zone.occupied}`);
  }
}
