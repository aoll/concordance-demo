import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { APP_CONFIG, type AppConfig } from '../config';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

/** Injection tokens: `@Inject(DB) db: Database`. */
export const DB = Symbol('DB');
const POOL = Symbol('POOL');

/**
 * The `pg` pool only connects on the first query: the contract export (`pnpm generate`)
 * instantiates the AppModule without a database, and that must keep working.
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

/** First row of a result that necessarily contains one (INSERT … RETURNING, count). */
export function one<T>(rows: T[]): T {
  const [row] = rows;
  if (row === undefined) throw new Error('Requête sans résultat');
  return row;
}
