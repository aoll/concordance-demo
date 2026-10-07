/**
 * Each table lives in its own module (`managers/`, `zones/`, `presences/`). This file gathers them
 * for the Drizzle client (`drizzle(pool, { schema })`) and for the migration scripts.
 */
export * from '../managers/managers.schema';
export * from '../presences/presences.schema';
export * from '../zones/zones.schema';
