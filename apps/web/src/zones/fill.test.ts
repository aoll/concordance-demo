import { describe, expect, it } from 'vitest';
import { fillOf } from './fill';

describe('fillOf', () => {
  it.each([
    [0, 3, 'free'],
    [1, 3, 'free'],
    [2, 3, 'busy'],
    [4, 6, 'busy'],
    [3, 3, 'full'],
  ])('%i/%i → %s', (occupied, capacity, key) => {
    expect(fillOf({ occupied, capacity }).key).toBe(key);
  });
});
