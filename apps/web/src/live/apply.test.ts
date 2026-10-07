import type { ZoneOccupancy } from '@concordance/api-client';
import type { ZoneOccupancyUpdated } from '@concordance/contracts';
import { describe, expect, it } from 'vitest';
import { feedEntry, withZoneSnapshot } from './apply';

const kenza = { id: 'm-kenza', displayName: 'Kenza A.' };
const shape = { path: 'M0,0 L10,0 L10,10 Z', label: { x: 5, y: 5 } };
const zones: ZoneOccupancy[] = [
  { id: 'z-orly', name: 'Orly', capacity: 3, shape, occupied: 0, managers: [] },
  { id: 'z-sd', name: 'Saint-Denis', capacity: 4, shape, occupied: 0, managers: [] },
];
const joined: ZoneOccupancyUpdated = {
  zone: { ...zones[0], occupied: 1, managers: [kenza] } as ZoneOccupancyUpdated['zone'],
  change: { kind: 'joined', manager: kenza },
  at: '2026-10-07T10:00:00.000Z',
};

describe('withZoneSnapshot', () => {
  it('remplace la zone concernée sans toucher aux autres', () => {
    const next = withZoneSnapshot(zones, joined.zone);
    expect(next?.[0]).toEqual(joined.zone);
    expect(next?.[1]).toBe(zones[1]);
  });

  it('est idempotent et ignore un cache vide', () => {
    const once = withZoneSnapshot(zones, joined.zone);
    expect(withZoneSnapshot(once, joined.zone)).toEqual(once);
    expect(withZoneSnapshot(undefined, joined.zone)).toBeUndefined();
  });
});

describe('feedEntry', () => {
  it("raconte l'arrivée d'un autre manager et ma propre fin de shift", () => {
    expect(feedEntry(joined, 'm-alex').text).toBe('Kenza A. a rejoint Orly');
    const left = { ...joined, change: { kind: 'left' as const, manager: kenza } };
    expect(feedEntry(left, 'm-kenza').text).toBe('Vous avez terminé votre shift sur Orly');
  });
});
