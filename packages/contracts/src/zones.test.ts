import { describe, expect, it } from 'vitest';
import { ZoneShapeSchema } from './zones';

describe('ZoneShapeSchema', () => {
  it('accepte un tracé et la position de son étiquette', () => {
    const shape = { path: 'M0,0 L10,0 L10,10 Z', label: { x: 5, y: 5 } };
    expect(ZoneShapeSchema.parse(shape)).toEqual(shape);
  });

  it('rejette un tracé vide ou une étiquette incomplète', () => {
    expect(ZoneShapeSchema.safeParse({ path: '', label: { x: 0, y: 0 } }).success).toBe(false);
    expect(ZoneShapeSchema.safeParse({ path: 'M0,0 Z', label: { x: 0 } }).success).toBe(false);
  });
});
