import type { ZoneOccupancy } from '@concordance/api-client';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { fillOf } from './fill';

interface ZoneListProps {
  zones: ZoneOccupancy[];
  /** ID of the selected zone. */
  selected: string | undefined;
  onSelect: (zoneId: string) => void;
}

/** Zone list in the bottom sheet (phone): another way besides the map to pick a zone. */
export function ZoneList({ zones, selected, onSelect }: ZoneListProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={selected ?? ''}
      // A zone always stays selected: a second tap on the same one does not deselect it.
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
