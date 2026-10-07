import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDatabase } from '../database/migrate';
import { SEED_ZONES } from '../database/seed-zones';
import { managers } from '../managers/managers.schema';
import { createTestApp, resetDatabase, type TestApp } from '../test/test-app';
import { zones as zonesTable } from './zones.schema';

describe('zones et santé (lot 1)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await resetDatabase(t.db);
    await seedDatabase(t.db);
  });

  afterAll(() => t.app.close());

  it('GET /health vérifie la base, hors préfixe /api', async () => {
    const response = await t.http().get('/health').expect(200);
    expect(response.body.info).toEqual({ database: { status: 'up' } });
  });

  it("GET /api/zones renvoie les zones de la base, dans leur ordre, avec l'occupation du seed", async () => {
    const response = await t.http().get('/api/zones').expect(200);
    const zones = response.body as Array<{
      id: string;
      occupied: number;
      capacity: number;
      shape: { path: string; label: { x: number; y: number } };
    }>;
    // Id fixes du seed : un lien ?zone=<id> est le même sur tous les environnements.
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

  it('ne sort jamais les champs internes du manager', async () => {
    const [karim] = await t.db.select().from(managers).where(eq(managers.displayName, 'Karim B.'));
    expect(karim?.email).toBeTruthy();
    const response = await t.http().get('/api/zones').expect(200);
    const body = JSON.stringify(response.body);
    expect(body).toContain('Karim B.');
    expect(body).not.toMatch(/email|matricule|phone|ratp\.example/);
    expect(Object.keys(response.body[0].managers[0]).sort()).toEqual(['displayName', 'id']);
  });

  it('GET /api/zones/:id : détail, ou 404 NOT_FOUND', async () => {
    const [first] = (await t.http().get('/api/zones')).body;
    const detail = await t.http().get(`/api/zones/${first.id}`).expect(200);
    expect(detail.body).toEqual(first);
    const missing = await t
      .http()
      .get('/api/zones/3f1c1f3e-8a51-4c7b-9a43-0d6c1d1e2f10')
      .expect(404);
    expect(missing.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('le seed est idempotent', async () => {
    await seedDatabase(t.db);
    const response = await t.http().get('/api/zones').expect(200);
    expect(response.body).toHaveLength(6);
    expect(response.body[0].occupied).toBe(3);
  });

  it('les zones vivent en base : une capacité modifiée est servie et survit au seed', async () => {
    const orly = SEED_ZONES.find((zone) => zone.name === 'Orly');
    if (!orly) throw new Error('Orly absente du seed');
    await t.db.update(zonesTable).set({ capacity: 5 }).where(eq(zonesTable.id, orly.id));
    await seedDatabase(t.db);
    const detail = await t.http().get(`/api/zones/${orly.id}`).expect(200);
    expect(detail.body).toMatchObject({ name: 'Orly', capacity: 5 });
  });
});
