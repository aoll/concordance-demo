import {
  type ServerToClientEvents,
  ZONE_OCCUPANCY_UPDATED,
  type ZoneOccupancyUpdated,
  ZoneOccupancyUpdatedSchema,
} from '@concordance/contracts';
import { io, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, login, resetDatabase, type TestApp } from '../test/test-app';

describe('temps réel (lot 5b)', () => {
  let t: TestApp;
  let socket: Socket<ServerToClientEvents>;
  let events: ZoneOccupancyUpdated[];
  let orlyId: string;

  /** Attend le n-ième événement reçu (les diffusions arrivent après la réponse HTTP). */
  const nth = (n: number) =>
    new Promise<ZoneOccupancyUpdated>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`événement ${n} jamais reçu`)), 2000);
      const poll = () => {
        const event = events[n - 1];
        if (!event) return void setTimeout(poll, 10);
        clearTimeout(timer);
        resolve(event);
      };
      poll();
    });

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.db);
    const zones = (await t.http().get('/api/zones')).body as Array<{ id: string; slug: string }>;
    orlyId = zones.find((zone) => zone.slug === 'orly')?.id ?? '';
    events = [];
    socket = io(await t.app.getUrl(), { transports: ['websocket'], forceNew: true });
    socket.on(ZONE_OCCUPANCY_UPDATED, (event) => events.push(event));
    await new Promise<void>((resolve) => socket.on('connect', resolve));
  });

  afterEach(() => {
    socket.disconnect();
  });

  afterAll(() => t.app.close());

  it("diffuse l'occupation après une inscription puis une fin de shift", async () => {
    const alex = await login(t.http, 'Alex');
    const { body: presence } = await t
      .http()
      .post('/api/presences')
      .set('Cookie', alex.cookie)
      .send({ zoneId: orlyId })
      .expect(201);

    const joined = await nth(1);
    expect(ZoneOccupancyUpdatedSchema.parse(joined)).toEqual(joined);
    expect(joined).toMatchObject({
      zone: { id: orlyId, slug: 'orly', occupied: 1, managers: [alex.manager] },
      change: { kind: 'joined', manager: alex.manager },
    });

    await t
      .http()
      .patch(`/api/presences/${presence.id}`)
      .set('Cookie', alex.cookie)
      .send({ status: 'ENDED' })
      .expect(200);
    expect(await nth(2)).toMatchObject({
      zone: { id: orlyId, occupied: 0, managers: [] },
      change: { kind: 'left', manager: alex.manager },
    });
  });

  it("n'émet rien quand l'inscription est refusée (zone pleine)", async () => {
    for (const name of ['A1', 'A2', 'A3']) {
      const { cookie } = await login(t.http, name);
      await t.http().post('/api/presences').set('Cookie', cookie).send({ zoneId: orlyId });
    }
    await nth(3);
    const { cookie } = await login(t.http, 'A4');
    await t
      .http()
      .post('/api/presences')
      .set('Cookie', cookie)
      .send({ zoneId: orlyId })
      .expect(409);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(events).toHaveLength(3);
    expect(events.at(-1)?.zone.occupied).toBe(3);
  });

  it("n'expose que les champs du contrat (pas d'email, de matricule…)", async () => {
    const { cookie } = await login(t.http, 'Alex');
    await t.http().post('/api/presences').set('Cookie', cookie).send({ zoneId: orlyId });
    const event = await nth(1);
    expect(Object.keys(event.change.manager).sort()).toEqual(['displayName', 'id']);
    expect(Object.keys(event.zone.managers[0] ?? {}).sort()).toEqual(['displayName', 'id']);
  });
});
