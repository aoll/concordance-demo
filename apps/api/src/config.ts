import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { z } from 'zod';

/** Variables d'environnement validées au démarrage : une config invalide arrête l'API tout de suite. */
const DEV_JWT_SECRET = 'change-me-in-dev';

const ConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url().default('postgres://concordance:concordance@localhost:5432/concordance'),
    JWT_SECRET: z.string().min(8).default(DEV_JWT_SECRET),
    /** Build du front servi par l'API (image de déploiement). Absent en dev : Vite sert le front. */
    WEB_DIST_DIR: z.string().min(1).optional(),
  })
  .refine((config) => config.NODE_ENV !== 'production' || config.JWT_SECRET !== DEV_JWT_SECRET, {
    path: ['JWT_SECRET'],
    message: 'JWT_SECRET obligatoire en production',
  });

export type AppConfig = z.infer<typeof ConfigSchema>;

/** Jeton d'injection de la config. */
export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // Le .env de la racine du monorepo, s'il existe (les variables déjà définies gagnent).
  const envFile = join(__dirname, '..', '..', '..', '.env');
  if (env === process.env && existsSync(envFile)) process.loadEnvFile(envFile);
  // Les hébergeurs (Railway…) imposent le port par PORT ; API_PORT reste prioritaire.
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
