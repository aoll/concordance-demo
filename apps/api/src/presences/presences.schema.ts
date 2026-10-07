import { sql } from 'drizzle-orm';
import { pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { managers } from '../managers/managers.schema';
import { zones } from '../zones/zones.schema';

export const presences = pgTable(
  'presences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    managerId: uuid('manager_id')
      .notNull()
      .references(() => managers.id),
    zoneId: uuid('zone_id')
      .notNull()
      .references(() => zones.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    /** null tant que le shift est en cours. */
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    // Règle 1, garantie par la base : au plus une présence active par manager.
    uniqueIndex('presences_one_active_per_manager')
      .on(table.managerId)
      .where(sql`${table.endedAt} IS NULL`),
  ],
);

export type PresenceRow = typeof presences.$inferSelect;
