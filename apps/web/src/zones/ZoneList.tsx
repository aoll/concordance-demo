import type { ZoneOccupancy } from '@concordance/api-client';
import type { ZoneSlug } from '@concordance/contracts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fillOf } from './fill';

interface ZoneListProps {
  zones: ZoneOccupancy[];
  selected: string | undefined;
  onSelect: (slug: ZoneSlug) => void;
}

/** Liste des zones de la bottom sheet (téléphone) : un autre chemin que la carte pour choisir. */
export function ZoneList({ zones, selected, onSelect }: ZoneListProps) {
  return (
    <nav
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] min-[720px]:hidden"
      aria-label="Zones"
    >
      {zones.map((zone) => (
        <Button
          key={zone.id}
          variant="outline"
          size="sm"
          className={cn(
            'h-9 flex-none rounded-full font-semibold',
            zone.slug === selected && 'border-primary ring-primary ring-1 ring-inset',
          )}
          aria-pressed={zone.slug === selected}
          data-testid={`zone-item-${zone.slug}`}
          onClick={() => onSelect(zone.slug as ZoneSlug)}
        >
          <i className={cn('bg-fill size-3 rounded-[3px]', `fill-${fillOf(zone).key}`)} />
          <span>{zone.name}</span>
          <b className="text-muted-foreground font-mono text-xs font-medium">
            {zone.occupied}/{zone.capacity}
          </b>
        </Button>
      ))}
    </nav>
  );
}
