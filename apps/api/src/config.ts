import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { z } from 'zod';

/** Environment variables validated at startup: an invalid config stops the API immediately. */
const DEV_JWT_SECRET = 'change-me-in-dev';

const ConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url().default('postgres://concordance:concordance@localhost:5432/concordance'),
    JWT_SECRET: z.string().min(8).default(DEV_JWT_SECRET),
    /** Front-end build served by the API (deployment image). Absent in dev: Vite serves the front end. */
    WEB_DIST_DIR: z.string().min(1).optional(),
  })
  .refine((config) => config.NODE_ENV !== 'production' || config.JWT_SECRET !== DEV_JWT_SECRET, {
    path: ['JWT_SECRET'],
    message: 'JWT_SECRET obligatoire en production',
  });

export type AppConfig = z.infer<typeof ConfigSchema>;

/** Config injection token. */
export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // The monorepo root .env, if it exists (already-defined variables win).
  const envFile = join(__dirname, '..', '..', '..', '.env');
  if (env === process.env && existsSync(envFile)) process.loadEnvFile(envFile);
  // Hosts (Railway…) set the port via PORT; API_PORT still takes priority.
  const parsed = ConfigSchema.safeParse({ ...env, API_PORT: env.API_PORT ?? env.PORT });
  if (!parsed.success) {
    throw new Error(`Configuration invalide :\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfig() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
