import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Codes d'erreur métier renvoyés par l'API. Le front s'appuie sur `code`, jamais sur `message`.
 * Les erreurs de validation (400) gardent le format de nestjs-zod.
 */
export const ErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'ZONE_FULL',
  'ALREADY_PRESENT',
  'PRESENCE_ALREADY_ENDED',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorResponseSchema = z.object({
  statusCode: z.int(),
  code: ErrorCodeSchema,
  message: z.string(),
});

export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
