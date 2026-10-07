import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

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

export type ZoneRow = typeof zones.$inferSelect;
