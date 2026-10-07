import { describe, expect, it } from 'vitest';
import { ZoneOccupancyUpdatedSchema } from './events';

const manager = { id: '3f1c1f3e-8a51-4c7b-9a43-0d6c1d1e2f10', displayName: 'Alex L.' };
const event = {
  zone: {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    name: 'Orly',
    capacity: 3,
    shape: { path: 'M0,0 L10,0 L10,10 Z', label: { x: 5, y: 5 } },
    occupied: 1,
    managers: [manager],
  },
  change: { kind: 'joined', manager },
  at: '2026-10-07T10:00:00.000Z',
};

describe('ZoneOccupancyUpdatedSchema', () => {
  it('accepte un événement valide', () => {
    expect(ZoneOccupancyUpdatedSchema.parse(event)).toEqual(event);
  });

  it('rejette une zone sans tracé ou un changement inconnu', () => {
    const { shape: _shape, ...withoutShape } = event.zone;
    const shapeless = { ...event, zone: withoutShape };
    const moved = { ...event, change: { ...event.change, kind: 'moved' } };
    expect(ZoneOccupancyUpdatedSchema.safeParse(shapeless).success).toBe(false);
    expect(ZoneOccupancyUpdatedSchema.safeParse(moved).success).toBe(false);
  });
});
