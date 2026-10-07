import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PresenceSchema = z.object({
  id: z.uuid(),
  managerId: z.uuid(),
  zoneId: z.uuid(),
  startedAt: z.iso.datetime(),
  /** null tant que le shift est en cours. */
  endedAt: z.iso.datetime().nullable(),
});

export class PresenceDto extends createZodDto(PresenceSchema) {}

/** S'inscrire sur une zone. Le manager vient du cookie de session, jamais du corps. */
export const CreatePresenceSchema = z.object({
  zoneId: z.uuid(),
});

export class CreatePresenceDto extends createZodDto(CreatePresenceSchema) {}

/** Fin de shift : l'heure de fin est posée par le serveur. */
export const UpdatePresenceSchema = z.object({
  status: z.literal('ENDED'),
});

export class UpdatePresenceDto extends createZodDto(UpdatePresenceSchema) {}

export const ListPresencesQuerySchema = z.object({
  managerId: z.uuid().optional(),
  zoneId: z.uuid().optional(),
  /** true : seulement les shifts en cours. */
  active: z.enum(['true', 'false']).optional(),
});

export class ListPresencesQueryDto extends createZodDto(ListPresencesQuerySchema) {}
