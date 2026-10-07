import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { migrateDatabase } from '../database/migrate';
import * as schema from '../database/schema';

/** Recreates the test database and runs the migrations on it, once per run. */
export default async function setup(): Promise<void> {
  const { DEV_DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (!DEV_DATABASE_URL || !TEST_DATABASE_URL) throw new Error('Voir vitest.config.mts');
  const admin = new Client({ connectionString: DEV_DATABASE_URL });
  try {
    await admin.connect();
  } catch (error) {
    throw new Error(
      `Postgres injoignable (${(error as Error).message}). Lancez d'abord \`pnpm db:up\`.`,
    );
  }
  await admin.query('DROP DATABASE IF EXISTS concordance_test WITH (FORCE)');
  await admin.query('CREATE DATABASE concordance_test');
  await admin.end();

  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  await migrateDatabase(drizzle(client, { schema }));
  await client.end();
}
