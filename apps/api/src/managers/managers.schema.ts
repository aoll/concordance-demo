import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const managers = pgTable('managers', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: text('display_name').notNull().unique(),
  // Internal fields: they never leave the API (the Manager DTO does not declare them).
  email: text('email'),
  matricule: text('matricule'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ManagerRow = typeof managers.$inferSelect;
