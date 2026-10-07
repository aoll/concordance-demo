import { type ZoneOccupancyUpdated, ZoneOccupancyUpdatedSchema } from '@concordance/contracts';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMockApi } from './mocks';

// Vérifie que le faux back applique les règles du contrat (le front s'appuie dessus).
const api = createMockApi();
const server = setupServer(...api.handlers);
const base = 'http://localhost';
const call = (path: string, init?: RequestInit) =>
  fetch(`${base}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json' },
  });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('createMockApi', () => {
  it('liste les 6 zones de la carte', async () => {
    const zones = await (await call('/api/zones')).json();
    expect(zones).toHaveLength(6);
    expect(zones.find((z: { slug: string }) => z.slug === 'la-defense')).toMatchObject({
      capacity: 3,
      occupied: 3,
    });
  });

  it('refuse une inscription sans session (401)', async () => {
    const response = await call('/api/presences', {
      method: 'POST',
      body: JSON.stringify({ zoneId: api.zones[0]?.id }),
    });
    expect(response.status).toBe(401);
  });

  it('inscrit, refuse une zone pleine, puis termine le shift', async () => {
    await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ displayName: 'Alex' }),
    });
    const defense = api.zones.find((z) => z.slug === 'la-defense');
    const full = await call('/api/presences', {
      method: 'POST',
      body: JSON.stringify({ zoneId: defense?.id }),
    });
    expect(full.status).toBe(409);
    expect(await full.json()).toMatchObject({ code: 'ZONE_FULL' });

    const orly = api.zones.find((z) => z.slug === 'orly');
    const created = await call('/api/presences', {
      method: 'POST',
      body: JSON.stringify({ zoneId: orly?.id }),
    });
    expect(created.status).toBe(201);
    const presence = await created.json();

    const again = await call('/api/presences', {
      method: 'POST',
      body: JSON.stringify({ zoneId: orly?.id }),
    });
    expect(await again.json()).toMatchObject({ code: 'ALREADY_PRESENT' });

    const ended = await call(`/api/presences/${presence.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ENDED' }),
    });
    expect(ended.status).toBe(200);
    expect((await ended.json()).endedAt).not.toBeNull();
  });

  it('émet zone.occupancy.updated comme la gateway (occupy puis release)', () => {
    const events: ZoneOccupancyUpdated[] = [];
    const live = createMockApi({ onEvent: (event) => events.push(event) });
    events.length = 0; // ignore le seed
    live.occupy('orly', 'Kenza A.');
    live.release('orly', 'Kenza A.');
    expect(events.map((event) => ZoneOccupancyUpdatedSchema.parse(event))).toMatchObject([
      { zone: { slug: 'orly', occupied: 1 }, change: { kind: 'joined' } },
      { zone: { slug: 'orly', occupied: 0 }, change: { kind: 'left' } },
    ]);
  });
});
