import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, isNull } from 'drizzle-orm';
import { NotFoundError } from '../common/errors';
import { toManager } from '../common/manager.mapper';
import { type Database, DB, one } from '../database/database.module';
import { managers, presences, type ZoneRow, zones } from '../database/schema';
import type { ZoneOccupancyDto } from './zones.dto';

@Injectable()
export class ZonesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(): Promise<ZoneOccupancyDto[]> {
    // Ordre d'affichage défini en base (colonne position), pas l'ordre alphabétique.
    const rows = await this.db.select().from(zones).orderBy(asc(zones.position), asc(zones.name));
    return this.occupancies(rows);
  }

  async get(id: string): Promise<ZoneOccupancyDto> {
    const rows = await this.db.select().from(zones).where(eq(zones.id, id));
    if (rows.length === 0) throw new NotFoundError('Zone inconnue.');
    return one(await this.occupancies(rows));
  }

  /** Zones + managers en shift : deux requêtes, assemblées en mémoire (quelques zones). */
  private async occupancies(rows: ZoneRow[]): Promise<ZoneOccupancyDto[]> {
    const active = await this.db
      .select({ zoneId: presences.zoneId, id: managers.id, displayName: managers.displayName })
      .from(presences)
      .innerJoin(managers, eq(managers.id, presences.managerId))
      .where(isNull(presences.endedAt))
      .orderBy(presences.startedAt);
    return rows.map((zone) => {
      const here = active.filter((presence) => presence.zoneId === zone.id).map(toManager);
      return {
        id: zone.id,
        name: zone.name,
        capacity: zone.capacity,
        shape: { path: zone.shape, label: { x: zone.labelX, y: zone.labelY } },
        occupied: here.length,
        managers: here,
      };
    });
  }
}
