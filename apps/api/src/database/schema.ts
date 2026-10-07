/**
 * Chaque table vit dans son module (`managers/`, `zones/`, `presences/`). Ce fichier les réunit
 * pour le client Drizzle (`drizzle(pool, { schema })`) et pour les scripts de migration.
 */
export * from '../managers/managers.schema';
export * from '../presences/presences.schema';
export * from '../zones/zones.schema';
