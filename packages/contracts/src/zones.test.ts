import { describe, expect, it } from 'vitest';
import { ZONE_SLUGS, ZONES, ZoneSlugSchema } from './zones';

describe('ZONES', () => {
  it('a des slugs uniques', () => {
    expect(new Set(ZONE_SLUGS).size).toBe(ZONES.length);
  });

  it('valide un slug connu et rejette les autres', () => {
    expect(ZoneSlugSchema.parse('orly')).toBe('orly');
    expect(ZoneSlugSchema.safeParse('lyon').success).toBe(false);
  });
});
