import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull, type SQL, sql } from 'drizzle-orm';
import {
  AlreadyPresentError,
  ForbiddenError,
  NotFoundError,
  PresenceAlreadyEndedError,
  ZoneFullError,
} from '../common/errors';
import { type Database, DB, one } from '../database/database.module';
import { type ManagerRow, type PresenceRow, presences, zones } from '../database/schema';
import type { ListPresencesQueryDto, PresenceDto } from './presences.dto';

const ONE_ACTIVE_PER_MANAGER = 'presences_one_active_per_manager';

@Injectable()
export class PresencesService {
  constructor(@Inject(DB) private readonly db: Database) {}

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
   * Inscription. La capacité est garantie par la base, pas par le code applicatif seul :
   * `SELECT … FOR UPDATE` sur la zone sérialise les inscriptions concurrentes sur cette zone,
   * le comptage et l'insertion se font donc sans qu'une autre transaction s'intercale.
   * L'index unique partiel couvre le dernier cas : le même manager sur deux zones à la fois.
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
      return toPresence(row);
    } catch (error) {
      if (isUniqueViolation(error, ONE_ACTIVE_PER_MANAGER)) throw new AlreadyPresentError();
      throw error;
    }
  }

  /** Fin de shift : seul l'auteur de la présence peut la clore (un superviseur, demain). */
  async end(manager: ManagerRow, id: string): Promise<PresenceDto> {
    const [presence] = await this.db.select().from(presences).where(eq(presences.id, id));
    if (!presence) throw new NotFoundError('Présence inconnue.');
    if (presence.managerId !== manager.id) {
      throw new ForbiddenError('Cette présence appartient à un autre manager.');
    }
    // La condition `ended_at IS NULL` protège aussi de deux fins de shift simultanées.
    const [ended] = await this.db
      .update(presences)
      .set({ endedAt: sql`now()` })
      .where(and(eq(presences.id, id), isNull(presences.endedAt)))
      .returning();
    if (!ended) throw new PresenceAlreadyEndedError();
    return toPresence(ended);
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

/** Violation d'unicité Postgres (23505) sur la contrainte donnée, éventuellement enveloppée par Drizzle. */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    const pgError = current as Error & { code?: string; constraint?: string };
    if (pgError.code === '23505' && pgError.constraint === constraint) return true;
  }
  return false;
}
