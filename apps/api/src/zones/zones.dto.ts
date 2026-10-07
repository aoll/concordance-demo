import { ZoneShapeSchema } from '@concordance/contracts';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ManagerSchema } from '../managers/manager.dto';

export const ZoneOccupancySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  capacity: z.int().positive(),
  /** Outline of the zone on the schematic plan: the front end draws the map from the API. */
  shape: ZoneShapeSchema,
  /** Number of active presences (endedAt null). */
  occupied: z.int().nonnegative(),
  managers: z.array(ManagerSchema),
});

export class ZoneOccupancyDto extends createZodDto(ZoneOccupancySchema) {}
