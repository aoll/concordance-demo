import { describe, expect, it } from 'vitest';
import { ZoneShapeSchema } from './zones';

describe('ZoneShapeSchema', () => {
  it('accepts a shape and its label position', () => {
    const shape = { path: 'M0,0 L10,0 L10,10 Z', label: { x: 5, y: 5 } };
    expect(ZoneShapeSchema.parse(shape)).toEqual(shape);
  });

  it('rejects an empty shape or an incomplete label', () => {
    expect(ZoneShapeSchema.safeParse({ path: '', label: { x: 0, y: 0 } }).success).toBe(false);
    expect(ZoneShapeSchema.safeParse({ path: 'M0,0 Z', label: { x: 0 } }).success).toBe(false);
  });
});
