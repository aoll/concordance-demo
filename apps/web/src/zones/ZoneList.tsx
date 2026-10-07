import type { ZoneOccupancy } from '@concordance/api-client';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { fillOf } from './fill';

interface ZoneListProps {
  zones: ZoneOccupancy[];
  /** Id de la zone sélectionnée. */
  selected: string | undefined;
  onSelect: (zoneId: string) => void;
}

/** Liste des zones de la bottom sheet (téléphone) : un autre chemin que la carte pour choisir. */
export function ZoneList({ zones, selected, onSelect }: ZoneListProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={selected ?? ''}
      // Une zone reste toujours sélectionnée : un second toucher sur la même ne la désélectionne pas.
      onValueChange={(zoneId) => zoneId && onSelect(zoneId)}
      aria-label="Zones"
      className="-mx-4 w-auto gap-2 overflow-x-auto px-4 pb-0.5 shadow-none [scrollbar-width:none] min-[720px]:hidden"
    >
      {zones.map((zone) => (
        <ToggleGroupItem
          key={zone.id}
          value={zone.id}
          data-testid={`zone-item-${zone.name}`}
          className="data-[state=on]:border-primary data-[state=on]:ring-primary h-9 flex-none rounded-full! border px-3 font-semibold data-[state=on]:bg-transparent data-[state=on]:ring-1 data-[state=on]:ring-inset"
        >
          <span className={cn('bg-fill size-3 rounded-[3px]', `fill-${fillOf(zone).key}`)} />
          {zone.name}
          <span className="text-muted-foreground font-mono text-xs font-medium">
            {zone.occupied}/{zone.capacity}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
