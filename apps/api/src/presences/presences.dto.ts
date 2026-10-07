import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PresenceSchema = z.object({
  id: z.uuid(),
  managerId: z.uuid(),
  zoneId: z.uuid(),
  startedAt: z.iso.datetime(),
  /** null while the shift is in progress. */
  endedAt: z.iso.datetime().nullable(),
});

export class PresenceDto extends createZodDto(PresenceSchema) {}

/** Sign up on a zone. The manager comes from the session cookie, never from the body. */
export const CreatePresenceSchema = z.object({
  zoneId: z.uuid(),
});

export class CreatePresenceDto extends createZodDto(CreatePresenceSchema) {}

/** End of shift: the end time is set by the server. */
export const UpdatePresenceSchema = z.object({
  status: z.literal('ENDED'),
});

export class UpdatePresenceDto extends createZodDto(UpdatePresenceSchema) {}

export const ListPresencesQuerySchema = z.object({
  managerId: z.uuid().optional(),
  zoneId: z.uuid().optional(),
  /** true: only shifts in progress. */
  active: z.enum(['true', 'false']).optional(),
});

export class ListPresencesQueryDto extends createZodDto(ListPresencesQuerySchema) {}
