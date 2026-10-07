import { z } from 'zod';

/**
 * Outline of a zone on the schematic map (SVG, viewBox 800 × 600) and position of its label.
 * Zones are defined in the database: the front end draws what the API returns, with no hard-coded list.
 */
export const ZoneShapeSchema = z.object({
  path: z.string().min(1),
  label: z.object({ x: z.number(), y: z.number() }),
});

export type ZoneShape = z.infer<typeof ZoneShapeSchema>;
