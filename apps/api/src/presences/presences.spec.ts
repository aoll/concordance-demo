import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, login, resetDatabase, type TestApp } from '../test/test-app';

describe('présences (lot 3b)', () => {
  let t: TestApp;
  let zoneByName: Map<string, { id: string; capacity: number }>;

  const zoneId = (name: string) => {
    const zone = zoneByName.get(name);
    if (!zone) throw new Error(name);
    return zone.id;
  };

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.db);
    const zones = (await t.http().get('/api/zones')).body as Array<{
      id: string;
      name: string;
      capacity: number;
    }>;
    zoneByName = new Map(zones.map((zone) => [zone.name, zone]));
  });

  afterAll(() => t.app.close());

  it('401 sans session sur toutes les routes de présence', async () => {
    await t.http().get('/api/presences').expect(401);
    await t
      .http()
      .post('/api/presences')
      .send({ zoneId: zoneId('Orly') })
      .expect(401);
  });

  it('valide le corps une fois connecté (400)', async () => {
    const { cookie } = await login(t.http, 'Alex');
    await t.http().post('/api/presences').set('Cookie', cookie).send({ zoneId: 'x' }).expect(400);
    await t
      .http()
      .patch('/api/presences/3f1c1f3e-8a51-4c7b-9a43-0d6c1d1e2f10')
      .set('Cookie', cookie)
      .send({ status: 'ACTIVE' })
      .expect(400);
  });

  it('inscription : 201, la zone compte le manager, puis 409 ALREADY_PRESENT', async () => {
    const { manager, cookie } = await login(t.http, 'Alex');
    const created = await t
      .http()
      .post('/api/presences')
      .set('Cookie', cookie)
      .send({ zoneId: zoneId('Orly') })
      .expect(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      managerId: manager.id,
      zoneId: zoneId('Orly'),
      startedAt: expect.any(String),
      endedAt: null,
    });

    const orly = await t
      .http()
      .get(`/api/zones/${zoneId('Orly')}`)
      .expect(200);
    expect(orly.body).toMatchObject({ occupied: 1, managers: [manager] });

    const again = await t
      .http()
      .post('/api/presences')
      .set('Cookie', cookie)
      .send({ zoneId: zoneId('Saint-Denis') })
      .expect(409);
    expect(again.body).toMatchObject({ statusCode: 409, code: 'ALREADY_PRESENT' });
  });

  it('zone pleine : 409 ZONE_FULL', async () => {
    for (const name of ['A1', 'A2', 'A3']) {
      const { cookie } = await login(t.http, name);
      await t
        .http()
        .post('/api/presences')
        .set('Cookie', cookie)
        .send({ zoneId: zoneId('Orly') })
        .expect(201);
    }
    const { cookie } = await login(t.http, 'A4');
    const full = await t
      .http()
      .post('/api/presences')
      .set('Cookie', cookie)
      .send({ zoneId: zoneId('Orly') })
      .expect(409);
    expect(full.body).toMatchObject({ code: 'ZONE_FULL' });
  });

  it('zone inconnue : 404 NOT_FOUND', async () => {
    const { cookie } = await login(t.http, 'Alex');
    const response = await t
      .http()
      .post('/api/presences')
      .set('Cookie', cookie)
      .send({ zoneId: '3f1c1f3e-8a51-4c7b-9a43-0d6c1d1e2f10' })
      .expect(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it("fin de shift : 403 pour un autre manager, 200 pour l'auteur, puis 409", async () => {
    const alex = await login(t.http, 'Alex');
    const sam = await login(t.http, 'Sam');
    const { body: presence } = await t
      .http()
      .post('/api/presences')
      .set('Cookie', alex.cookie)
      .send({ zoneId: zoneId('Orly') })
      .expect(201);
    const end = (cookie: string) =>
      t
        .http()
        .patch(`/api/presences/${presence.id}`)
        .set('Cookie', cookie)
        .send({ status: 'ENDED' });

    expect((await end(sam.cookie).expect(403)).body).toMatchObject({ code: 'FORBIDDEN' });
    const ended = await end(alex.cookie).expect(200);
    expect(ended.body.endedAt).toEqual(expect.any(String));
    expect((await end(alex.cookie).expect(409)).body).toMatchObject({
      code: 'PRESENCE_ALREADY_ENDED',
    });

    const missing = await t
      .http()
      .patch('/api/presences/3f1c1f3e-8a51-4c7b-9a43-0d6c1d1e2f10')
      .set('Cookie', alex.cookie)
      .send({ status: 'ENDED' })
      .expect(404);
    expect(missing.body).toMatchObject({ code: 'NOT_FOUND' });

    // The spot is freed and the manager can start a shift again.
    const orly = await t
      .http()
      .get(`/api/zones/${zoneId('Orly')}`)
      .expect(200);
    expect(orly.body.occupied).toBe(0);
    await t
      .http()
      .post('/api/presences')
      .set('Cookie', alex.cookie)
      .send({ zoneId: zoneId('Orly') })
      .expect(201);
  });

  it('GET /api/presences filtre par manager, zone et état', async () => {
    const alex = await login(t.http, 'Alex');
    const sam = await login(t.http, 'Sam');
    const join = (cookie: string, zoneName: string) =>
      t
        .http()
        .post('/api/presences')
        .set('Cookie', cookie)
        .send({ zoneId: zoneId(zoneName) })
        .expect(201);
    const { body: first } = await join(alex.cookie, 'Orly');
    await t
      .http()
      .patch(`/api/presences/${first.id}`)
      .set('Cookie', alex.cookie)
      .send({ status: 'ENDED' })
      .expect(200);
    const { body: current } = await join(alex.cookie, 'Saint-Denis');
    const { body: samShift } = await join(sam.cookie, 'Saint-Denis');

    const list = async (query: Record<string, string>) =>
      (
        await t.http().get('/api/presences').query(query).set('Cookie', alex.cookie).expect(200)
      ).body.map((presence: { id: string }) => presence.id);

    expect(await list({ managerId: alex.manager.id, active: 'true' })).toEqual([current.id]);
    expect(await list({ managerId: alex.manager.id, active: 'false' })).toEqual([first.id]);
    expect((await list({ zoneId: zoneId('Saint-Denis'), active: 'true' })).sort()).toEqual(
      [current.id, samShift.id].sort(),
    );
    expect(await list({})).toHaveLength(3);
  });
});
