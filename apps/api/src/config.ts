import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { z } from 'zod';

/** Variables d'environnement validées au démarrage : une config invalide arrête l'API tout de suite. */
const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url().default('postgres://concordance:concordance@localhost:5432/concordance'),
  JWT_SECRET: z.string().min(8).default('change-me-in-dev'),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

/** Jeton d'injection de la config. */
export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // Le .env de la racine du monorepo, s'il existe (les variables déjà définies gagnent).
  const envFile = join(__dirname, '..', '..', '..', '.env');
  if (env === process.env && existsSync(envFile)) process.loadEnvFile(envFile);
  const parsed = ConfigSchema.safeParse(env);
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
