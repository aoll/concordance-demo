import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const managers = pgTable('managers', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: text('display_name').notNull().unique(),
  // Champs internes : ils ne sortent jamais de l'API (le DTO Manager ne les déclare pas).
  email: text('email'),
  matricule: text('matricule'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const zones = pgTable(
  'zones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    capacity: integer('capacity').notNull(),
    /** Ordre d'affichage dans les listes. */
    position: integer('position').notNull(),
    /** Tracé SVG de la zone sur le plan schématique (viewBox 800 × 600). */
    shape: text('shape').notNull(),
    /** Position de l'étiquette (nom + compteur) sur le plan. */
    labelX: integer('label_x').notNull(),
    labelY: integer('label_y').notNull(),
  },
  (table) => [check('zones_capacity_positive', sql`${table.capacity} > 0`)],
);

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

export type ManagerRow = typeof managers.$inferSelect;
export type ZoneRow = typeof zones.$inferSelect;
export type PresenceRow = typeof presences.$inferSelect;
