import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const zones = pgTable(
  'zones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    capacity: integer('capacity').notNull(),
    /** Display order in lists. */
    position: integer('position').notNull(),
    /** SVG outline of the zone on the schematic plan (viewBox 800 × 600). */
    shape: text('shape').notNull(),
    /** Position of the label (name + counter) on the plan. */
    labelX: integer('label_x').notNull(),
    labelY: integer('label_y').notNull(),
  },
  (table) => [check('zones_capacity_positive', sql`${table.capacity} > 0`)],
);

export type ZoneRow = typeof zones.$inferSelect;
