import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull, type SQL, sql } from 'drizzle-orm';
import {
  AlreadyPresentError,
  ForbiddenError,
  NotFoundError,
  PresenceAlreadyEndedError,
  ZoneFullError,
} from '../common/errors';
import { type Database, DB, one } from '../database/database.module';
import type { ManagerRow } from '../managers/managers.schema';
import { zones } from '../zones/zones.schema';
import { ZonesService } from '../zones/zones.service';
import { PresenceGateway } from './presence.gateway';
import type { ListPresencesQueryDto, PresenceDto } from './presences.dto';
import { type PresenceRow, presences } from './presences.schema';

const ONE_ACTIVE_PER_MANAGER = 'presences_one_active_per_manager';

@Injectable()
export class PresencesService {
  private readonly logger = new Logger(PresencesService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly zones: ZonesService,
    private readonly gateway: PresenceGateway,
  ) {}

  async list(query: ListPresencesQueryDto): Promise<PresenceDto[]> {
    const filters: SQL[] = [];
    if (query.managerId) filters.push(eq(presences.managerId, query.managerId));
    if (query.zoneId) filters.push(eq(presences.zoneId, query.zoneId));
    if (query.active === 'true') filters.push(isNull(presences.endedAt));
    if (query.active === 'false') filters.push(isNotNull(presences.endedAt));
    const rows = await this.db
      .select()
      .from(presences)
      .where(and(...filters))
      .orderBy(desc(presences.startedAt));
    return rows.map(toPresence);
  }

  /**
   * Sign-up. Capacity is guaranteed by the database, not by application code alone:
   * `SELECT … FOR UPDATE` on the zone serializes concurrent sign-ups on that zone,
   * so counting and inserting happen without another transaction slipping in between.
   * The partial unique index covers the last case: the same manager on two zones at once.
   */
  async create(manager: ManagerRow, zoneId: string): Promise<PresenceDto> {
    try {
      const row = await this.db.transaction(async (tx) => {
        const [zone] = await tx.select().from(zones).where(eq(zones.id, zoneId)).for('update');
        if (!zone) throw new NotFoundError('Zone inconnue.');

        const [current] = await tx
          .select({ id: presences.id })
          .from(presences)
          .where(and(eq(presences.managerId, manager.id), isNull(presences.endedAt)));
        if (current) throw new AlreadyPresentError();

        const { occupied } = one(
          await tx
            .select({ occupied: sql<number>`count(*)::int` })
            .from(presences)
            .where(and(eq(presences.zoneId, zone.id), isNull(presences.endedAt))),
        );
        if (occupied >= zone.capacity) throw new ZoneFullError();

        return one(
          await tx.insert(presences).values({ managerId: manager.id, zoneId: zone.id }).returning(),
        );
      });
      await this.announce('joined', manager, row.zoneId);
      return toPresence(row);
    } catch (error) {
      if (isUniqueViolation(error, ONE_ACTIVE_PER_MANAGER)) throw new AlreadyPresentError();
      throw error;
    }
  }

  /** End of shift: only the presence's author can close it (a supervisor, tomorrow). */
  async end(manager: ManagerRow, id: string): Promise<PresenceDto> {
    const [presence] = await this.db.select().from(presences).where(eq(presences.id, id));
    if (!presence) throw new NotFoundError('Présence inconnue.');
    if (presence.managerId !== manager.id) {
      throw new ForbiddenError('Cette présence appartient à un autre manager.');
    }
    // The `ended_at IS NULL` condition also protects against two simultaneous shift ends.
    const [ended] = await this.db
      .update(presences)
      .set({ endedAt: sql`now()` })
      .where(and(eq(presences.id, id), isNull(presences.endedAt)))
      .returning();
    if (!ended) throw new PresenceAlreadyEndedError();
    await this.announce('left', manager, ended.zoneId);
    return toPresence(ended);
  }

  /**
   * Broadcast after commit: occupancy is re-read from the database, so other clients never
   * see a state that was not committed. A broadcast failure does not fail the request:
   * the change is saved, and clients resynchronize on their next load.
   */
  private async announce(kind: 'joined' | 'left', manager: ManagerRow, zoneId: string) {
    try {
      this.gateway.broadcast({
        zone: await this.zones.get(zoneId),
        change: { kind, manager: { id: manager.id, displayName: manager.displayName } },
        at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Diffusion impossible pour la zone ${zoneId}`, error);
    }
  }
}

function toPresence(row: PresenceRow): PresenceDto {
  return {
    id: row.id,
    managerId: row.managerId,
    zoneId: row.zoneId,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
  };
}

/** Postgres uniqueness violation (23505) on the given constraint, possibly wrapped by Drizzle. */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    const pgError = current as Error & { code?: string; constraint?: string };
    if (pgError.code === '23505' && pgError.constraint === constraint) return true;
  }
  return false;
}
