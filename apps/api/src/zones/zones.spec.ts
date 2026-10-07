import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDatabase } from '../database/migrate';
import { SEED_ZONES } from '../database/seed-zones';
import { managers } from '../managers/managers.schema';
import { createTestApp, resetDatabase, type TestApp } from '../test/test-app';
import { zones as zonesTable } from './zones.schema';

describe('zones and health (lot 1)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await resetDatabase(t.db);
    await seedDatabase(t.db);
  });

  afterAll(() => t.app.close());

  it('GET /health checks the database, outside the /api prefix', async () => {
    const response = await t.http().get('/health').expect(200);
    expect(response.body.info).toEqual({ database: { status: 'up' } });
  });

  it('sets the security headers (helmet) and hides Express', async () => {
    const response = await t.http().get('/api/zones').expect(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('GET /api/zones returns the zones from the database, in order, with the seed occupancy', async () => {
    const response = await t.http().get('/api/zones').expect(200);
    const zones = response.body as Array<{
      id: string;
      occupied: number;
      capacity: number;
      shape: { path: string; label: { x: number; y: number } };
    }>;
    // Fixed seed ids: a ?zone=<id> link is the same across all environments.
    expect(zones.map((zone) => zone.id)).toEqual(SEED_ZONES.map((zone) => zone.id));
    expect(zones[0]?.shape).toEqual({
      path: SEED_ZONES[0].shape,
      label: { x: SEED_ZONES[0].labelX, y: SEED_ZONES[0].labelY },
    });
    expect(zones.map((zone) => `${zone.occupied}/${zone.capacity}`)).toEqual([
      '3/6',
      '5/6',
      '3/3',
      '1/4',
      '2/4',
      '0/3',
    ]);
  });

  it('never exposes the manager internal fields', async () => {
    const [karim] = await t.db.select().from(managers).where(eq(managers.displayName, 'Karim B.'));
    expect(karim?.email).toBeTruthy();
    const response = await t.http().get('/api/zones').expect(200);
    const body = JSON.stringify(response.body);
    expect(body).toContain('Karim B.');
    expect(body).not.toMatch(/email|matricule|phone|ratp\.example/);
    expect(Object.keys(response.body[0].managers[0]).sort()).toEqual(['displayName', 'id']);
  });

  it('GET /api/zones/:id: detail, or 404 NOT_FOUND', async () => {
    const [first] = (await t.http().get('/api/zones')).body;
    const detail = await t.http().get(`/api/zones/${first.id}`).expect(200);
    expect(detail.body).toEqual(first);
    const missing = await t
      .http()
      .get('/api/zones/3f1c1f3e-8a51-4c7b-9a43-0d6c1d1e2f10')
      .expect(404);
    expect(missing.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('the seed is idempotent', async () => {
    await seedDatabase(t.db);
    const response = await t.http().get('/api/zones').expect(200);
    expect(response.body).toHaveLength(6);
    expect(response.body[0].occupied).toBe(3);
  });

  it('zones live in the database: a modified capacity is served and survives the seed', async () => {
    const orly = SEED_ZONES.find((zone) => zone.name === 'Orly');
    if (!orly) throw new Error('Orly absente du seed');
    await t.db.update(zonesTable).set({ capacity: 5 }).where(eq(zonesTable.id, orly.id));
    await seedDatabase(t.db);
    const detail = await t.http().get(`/api/zones/${orly.id}`).expect(200);
    expect(detail.body).toMatchObject({ name: 'Orly', capacity: 5 });
  });
});
