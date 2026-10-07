import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ManagerSchema } from '../managers/manager.dto';

/** No real auth for the demo: a username is enough (the target would be RATP SSO via OIDC). */
export const LoginSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
});

export class LoginDto extends createZodDto(LoginSchema) {}

export const SessionSchema = z.object({
  manager: ManagerSchema,
});

export class SessionDto extends createZodDto(SessionSchema) {}
