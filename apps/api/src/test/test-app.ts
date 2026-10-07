import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../app.module';
import { SESSION_COOKIE } from '../auth/auth.guard';
import { type Database, DB } from '../database/database.module';
import { seedDatabase } from '../database/migrate';
import { configureApp } from '../setup';

export interface TestApp {
  app: INestApplication;
  db: Database;
  http: () => ReturnType<typeof request>;
}

/** The full API (AppModule) on the test database. */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  // A real port: supertest reuses the server instead of opening one per request.
  await app.listen(0);
  const db = app.get<Database>(DB);
  return { app, db, http: () => request(app.getHttpServer()) };
}

/** Empty database: the map's 6 zones, no managers or presences. */
export async function resetDatabase(db: Database): Promise<void> {
  await db.execute(sql`TRUNCATE presences, managers, zones CASCADE`);
  await seedDatabase(db, { demoPresences: false });
}

/** Login by nickname; returns the manager and the Cookie header to replay. */
export async function login(http: TestApp['http'], displayName: string) {
  const response = await http().post('/api/auth/login').send({ displayName }).expect(200);
  const cookie = ([] as string[])
    .concat(response.headers['set-cookie'] ?? [])
    .find((header) => header.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) throw new Error('Pas de cookie de session');
  return {
    manager: response.body.manager as { id: string; displayName: string },
    cookie: cookie.split(';')[0] as string,
  };
}
