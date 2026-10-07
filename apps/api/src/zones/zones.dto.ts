import { ZoneSlugSchema } from '@concordance/contracts';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ManagerSchema } from '../common/manager.dto';

export const ZoneOccupancySchema = z.object({
  id: z.uuid(),
  /** Id du <path> de la zone dans la carte SVG. */
  slug: ZoneSlugSchema,
  name: z.string(),
  capacity: z.int().positive(),
  /** Nombre de présences actives (endedAt null). */
  occupied: z.int().nonnegative(),
  managers: z.array(ManagerSchema),
});

export class ZoneOccupancyDto extends createZodDto(ZoneOccupancySchema) {}
