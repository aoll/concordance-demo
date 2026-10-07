import { z } from 'zod';

/**
 * Tracé d'une zone sur le plan schématique (SVG, viewBox 800 × 600) et position de son étiquette.
 * Les zones sont définies en base : le front dessine ce que l'API renvoie, sans liste en dur.
 */
export const ZoneShapeSchema = z.object({
  path: z.string().min(1),
  label: z.object({ x: z.number(), y: z.number() }),
});

export type ZoneShape = z.infer<typeof ZoneShapeSchema>;
