import { ZoneShapeSchema } from '@concordance/contracts';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ManagerSchema } from '../common/manager.dto';

export const ZoneOccupancySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  capacity: z.int().positive(),
  /** Tracé de la zone sur le plan schématique : le front dessine la carte à partir de l'API. */
  shape: ZoneShapeSchema,
  /** Nombre de présences actives (endedAt null). */
  occupied: z.int().nonnegative(),
  managers: z.array(ManagerSchema),
});

export class ZoneOccupancyDto extends createZodDto(ZoneOccupancySchema) {}
