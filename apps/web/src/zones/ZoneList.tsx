import type { ZoneOccupancy } from '@concordance/api-client';
import type { ZoneSlug } from '@concordance/contracts';
import { fillOf } from './fill';

interface ZoneListProps {
  zones: ZoneOccupancy[];
  selected: string | undefined;
  onSelect: (slug: ZoneSlug) => void;
}

/** Liste des zones de la bottom sheet (téléphone) : un autre chemin que la carte pour choisir. */
export function ZoneList({ zones, selected, onSelect }: ZoneListProps) {
  return (
    <nav className="zlist" aria-label="Zones">
      {zones.map((zone) => (
        <button
          key={zone.id}
          type="button"
          className={zone.slug === selected ? 'on' : undefined}
          aria-pressed={zone.slug === selected}
          data-testid={`zone-item-${zone.slug}`}
          onClick={() => onSelect(zone.slug as ZoneSlug)}
        >
          <i className={`sw fill-${fillOf(zone).key}`} />
          <span>{zone.name}</span>
          <b>
            {zone.occupied}/{zone.capacity}
          </b>
        </button>
      ))}
    </nav>
  );
}
