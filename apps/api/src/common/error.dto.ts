import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Business error codes returned by the API. The front end relies on `code`, never on `message`.
 * Validation errors (400) keep the nestjs-zod format.
 */
export const ErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'ZONE_FULL',
  'ALREADY_PRESENT',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorResponseSchema = z.object({
  statusCode: z.int(),
  code: ErrorCodeSchema,
  message: z.string(),
});

export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
