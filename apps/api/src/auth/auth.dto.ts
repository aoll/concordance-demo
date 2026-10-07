import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ManagerSchema } from '../managers/manager.dto';

/** Pas de vraie auth pour la démo : un pseudo suffit (la cible serait le SSO RATP en OIDC). */
export const LoginSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
});

export class LoginDto extends createZodDto(LoginSchema) {}

export const SessionSchema = z.object({
  manager: ManagerSchema,
});

export class SessionDto extends createZodDto(SessionSchema) {}
