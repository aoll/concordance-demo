import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const managers = pgTable('managers', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: text('display_name').notNull().unique(),
  // Champs internes : ils ne sortent jamais de l'API (le DTO Manager ne les déclare pas).
  email: text('email'),
  matricule: text('matricule'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ManagerRow = typeof managers.$inferSelect;
