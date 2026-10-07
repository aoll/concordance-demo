import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { APP_CONFIG, type AppConfig } from '../config';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

/** Jetons d'injection : `@Inject(DB) db: Database`. */
export const DB = Symbol('DB');
const POOL = Symbol('POOL');

/**
 * Le pool `pg` ne se connecte qu'à la première requête : l'export du contrat (`pnpm generate`)
 * instancie l'AppModule sans base, et ça doit continuer à marcher.
 */
@Global()
@Module({
  providers: [
    {
      provide: POOL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new Pool({ connectionString: config.DATABASE_URL }),
    },
    {
      provide: DB,
      inject: [POOL],
      useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

/** Première ligne d'un résultat qui en contient forcément une (INSERT … RETURNING, count). */
export function one<T>(rows: T[]): T {
  const [row] = rows;
  if (row === undefined) throw new Error('Requête sans résultat');
  return row;
}
