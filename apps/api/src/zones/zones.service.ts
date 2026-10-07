import { ZONES } from '@concordance/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { eq, isNull } from 'drizzle-orm';
import { NotFoundError } from '../common/errors';
import { toManager } from '../common/manager.mapper';
import { type Database, DB, one } from '../database/database.module';
import { managers, presences, type ZoneRow, zones } from '../database/schema';
import type { ZoneOccupancyDto } from './zones.dto';

/** Ordre d'affichage : celui de la carte, pas l'ordre alphabétique. */
const MAP_ORDER = new Map<string, number>(ZONES.map((zone, index) => [zone.slug, index]));

@Injectable()
export class ZonesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(): Promise<ZoneOccupancyDto[]> {
    const rows = await this.db.select().from(zones);
    const occupancies = await this.occupancies(rows);
    return occupancies.sort(
      (a, b) => (MAP_ORDER.get(a.slug) ?? Infinity) - (MAP_ORDER.get(b.slug) ?? Infinity),
    );
  }

  async get(id: string): Promise<ZoneOccupancyDto> {
    const rows = await this.db.select().from(zones).where(eq(zones.id, id));
    if (rows.length === 0) throw new NotFoundError('Zone inconnue.');
    return one(await this.occupancies(rows));
  }

  /** Zones + managers en shift : deux requêtes, assemblées en mémoire (6 zones). */
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
        slug: zone.slug as ZoneOccupancyDto['slug'],
        name: zone.name,
        capacity: zone.capacity,
        occupied: here.length,
        managers: here,
      };
    });
  }
}
