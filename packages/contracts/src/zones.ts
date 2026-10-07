import { z } from 'zod';

/**
 * Les 6 zones de la démo. Le slug est l'id du <path> dans la carte SVG du front
 * et la clé de la zone en base : c'est le seul lien entre la carte et les données.
 * Source unique pour le seed (lot 1), les mocks (front) et la carte (lot 2c).
 */
export const ZONES = [
  { slug: 'paris-rive-droite', name: 'Paris rive droite', capacity: 6 },
  { slug: 'paris-rive-gauche', name: 'Paris rive gauche', capacity: 6 },
  { slug: 'la-defense', name: 'La Défense', capacity: 3 },
  { slug: 'saint-denis', name: 'Saint-Denis', capacity: 4 },
  { slug: 'marne-la-vallee', name: 'Marne-la-Vallée', capacity: 4 },
  { slug: 'orly', name: 'Orly', capacity: 3 },
] as const;

export const ZONE_SLUGS = ZONES.map((zone) => zone.slug) as [ZoneSlug, ...ZoneSlug[]];

export type ZoneSlug = (typeof ZONES)[number]['slug'];

export const ZoneSlugSchema = z.enum(ZONE_SLUGS);
