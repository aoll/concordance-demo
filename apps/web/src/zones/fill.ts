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

/** Couleur d'une zone selon son remplissage : libre, presque pleine (≥ 2/3), complète. */
export function fillOf(zone: Pick<ZoneOccupancy, 'occupied' | 'capacity'>): Fill {
  // En entiers : 2/3 vaut 0,666… et raterait un seuil écrit 0.67.
  const { occupied, capacity } = zone;
  const key: FillKey =
    occupied >= capacity ? 'full' : occupied * 3 >= capacity * 2 ? 'busy' : 'free';
  return { key, label: LABELS[key] };
}

export const FILL_KEYS = Object.keys(LABELS) as FillKey[];
export const fillLabel = (key: FillKey) => LABELS[key];
