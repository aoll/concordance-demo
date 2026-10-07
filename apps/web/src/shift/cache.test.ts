import type { ZoneOccupancy } from '@concordance/api-client';
import { describe, expect, it } from 'vitest';
import { isOptimistic, optimisticPresence, withJoined, withLeft } from './cache';

const me = { id: 'me', displayName: 'Alex L.' };
const zones: ZoneOccupancy[] = [
  {
    id: 'z1',
    slug: 'orly',
    name: 'Orly',
    capacity: 3,
    occupied: 1,
    managers: [{ id: 'm1', displayName: 'Fatou S.' }],
  },
  { id: 'z2', slug: 'la-defense', name: 'La Défense', capacity: 3, occupied: 0, managers: [] },
];

describe('mises à jour optimistes du cache', () => {
  it("ajoute le manager à la zone rejointe, sans toucher l'instantané", () => {
    const next = withJoined(zones, 'z1', me);
    expect(next?.[0]).toMatchObject({ occupied: 2, managers: [{ id: 'm1' }, { id: 'me' }] });
    expect(next?.[1]).toBe(zones[1]);
    expect(zones[0]?.occupied).toBe(1);
  });

  it('retire le manager de sa zone en fin de shift', () => {
    const joined = withJoined(zones, 'z1', me);
    expect(withLeft(joined, 'z1', 'me')?.[0]).toMatchObject({
      occupied: 1,
      managers: [{ id: 'm1' }],
    });
  });

  it("ne décompte pas une zone où le manager n'est pas", () => {
    expect(withLeft(zones, 'z2', 'me')?.[1]?.occupied).toBe(0);
  });

  it('laisse un cache vide tel quel', () => {
    expect(withJoined(undefined, 'z1', me)).toBeUndefined();
  });

  it('marque la présence provisoire', () => {
    const presence = optimisticPresence('me', 'z1', new Date('2026-10-07T08:00:00Z'));
    expect(presence).toMatchObject({ zoneId: 'z1', endedAt: null });
    expect(isOptimistic(presence)).toBe(true);
  });
});
