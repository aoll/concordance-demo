import { and, eq, isNull, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, login, resetDatabase, type TestApp } from '../test/test-app';
import { presences } from './presences.schema';

/**
 * Exit criterion of lot 3: N simultaneous sign-ups on a zone with capacity 3
 * yield exactly 3 presences. Requests go through HTTP, in parallel, and
 * the `pg` pool opens several connections: the transactions really overlap.
 */
describe('capacity under concurrency (lot 3b)', () => {
  const N = 30;
  let t: TestApp;
  let laDefense: { id: string; capacity: number };

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
    const zone = zones.find((candidate) => candidate.name === 'La Défense');
    if (!zone) throw new Error('La Défense absente du seed');
    laDefense = zone;
  });

  afterAll(() => t.app.close());

  const activeIn = async (zoneId: string) => {
    const [row] = await t.db
      .select({ count: sql<number>`count(*)::int` })
      .from(presences)
      .where(and(eq(presences.zoneId, zoneId), isNull(presences.endedAt)));
    return row?.count;
  };

  // Several rounds: a race won by luck once is not enough.
  it.each([1, 2, 3, 4, 5])(
    `${N} managers sign up at the same time on a zone of capacity 3 (round %i)`,
    async () => {
      expect(laDefense.capacity).toBe(3);
      const sessions = await Promise.all(
        Array.from({ length: N }, (_, index) => login(t.http, `Manager ${index}`)),
      );

      const responses = await Promise.all(
        sessions.map(({ cookie }) =>
          t.http().post('/api/presences').set('Cookie', cookie).send({ zoneId: laDefense.id }),
        ),
      );

      const statuses = responses.map((response) => response.status);
      expect(statuses.filter((status) => status === 201)).toHaveLength(3);
      expect(statuses.filter((status) => status === 409)).toHaveLength(N - 3);
      for (const response of responses.filter((r) => r.status === 409)) {
        expect(response.body.code).toBe('ZONE_FULL');
      }
      expect(await activeIn(laDefense.id)).toBe(3);
    },
  );

  it('the same manager on all 6 zones at once: only one active presence', async () => {
    const { cookie, manager } = await login(t.http, 'Ubiquiste');
    const zones = (await t.http().get('/api/zones')).body as Array<{ id: string }>;
    const responses = await Promise.all(
      zones.map((zone) =>
        t.http().post('/api/presences').set('Cookie', cookie).send({ zoneId: zone.id }),
      ),
    );
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409]);
    for (const response of responses.filter((r) => r.status === 409)) {
      expect(response.body.code).toBe('ALREADY_PRESENT');
    }
    const active = await t.db
      .select()
      .from(presences)
      .where(and(eq(presences.managerId, manager.id), isNull(presences.endedAt)));
    expect(active).toHaveLength(1);
  });
});
