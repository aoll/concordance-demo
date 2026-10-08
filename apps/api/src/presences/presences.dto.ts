import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PresenceSchema = z.object({
  id: z.uuid(),
  managerId: z.uuid(),
  zoneId: z.uuid(),
  startedAt: z.iso.datetime(),
  /** null while the shift is in progress. */
  endedAt: z.iso.datetime().nullable(),
  /** Derived from endedAt: ACTIVE while the shift is in progress. */
  status: z.enum(['ACTIVE', 'ENDED']),
});

export class PresenceDto extends createZodDto(PresenceSchema) {}

/** Sign up on a zone. The manager comes from the session cookie, never from the body. */
export const CreatePresenceSchema = z.object({
  zoneId: z.uuid(),
});

export class CreatePresenceDto extends createZodDto(CreatePresenceSchema) {}

/**
 * Full representation of the `status` sub-resource, replaced by PUT. Only ENDED can be written:
 * a shift never goes back to ACTIVE, and the end time is set by the server.
 */
export const PresenceStatusSchema = z.object({
  status: z.literal('ENDED'),
});

export class PresenceStatusDto extends createZodDto(PresenceStatusSchema) {}

export const ListPresencesQuerySchema = z.object({
  managerId: z.uuid().optional(),
  zoneId: z.uuid().optional(),
  /** true: only shifts in progress. */
  active: z.enum(['true', 'false']).optional(),
});

export class ListPresencesQueryDto extends createZodDto(ListPresencesQuerySchema) {}
