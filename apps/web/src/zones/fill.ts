import type { ZoneOccupancy } from '@concordance/api-client';

export type FillKey = 'free' | 'busy' | 'full';

export interface Fill {
  key: FillKey;
  label: string;
}

const LABELS: Record<FillKey, string> = {
  free: 'Places libres',
  busy: 'Presque pleine',
  full: 'Complète',
};

/** Color of a zone based on its fill level: free, almost full (≥ 2/3), full. */
export function fillOf(zone: Pick<ZoneOccupancy, 'occupied' | 'capacity'>): Fill {
  // In integers: 2/3 is 0.666… and would miss a threshold written as 0.67.
  const { occupied, capacity } = zone;
  const key: FillKey =
    occupied >= capacity ? 'full' : occupied * 3 >= capacity * 2 ? 'busy' : 'free';
  return { key, label: LABELS[key] };
}

export const FILL_KEYS = Object.keys(LABELS) as FillKey[];
export const fillLabel = (key: FillKey) => LABELS[key];
