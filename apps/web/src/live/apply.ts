import type { ZoneOccupancy } from '@concordance/api-client';
import type { ZoneOccupancyUpdated, ZoneSnapshot } from '@concordance/contracts';

/**
 * Replaces a zone in the `GET /zones` cache with the snapshot received in real time.
 * The event carries the full occupancy: applying it twice changes nothing.
 */
export function withZoneSnapshot(
  zones: ZoneOccupancy[] | undefined,
  snapshot: ZoneSnapshot,
): ZoneOccupancy[] | undefined {
  return zones?.map((zone) => (zone.id === snapshot.id ? snapshot : zone));
}

export interface FeedEntry {
  key: string;
  at: string;
  text: string;
}

/** Activity feed line, worded as in the mockup. */
export function feedEntry(event: ZoneOccupancyUpdated, meId: string): FeedEntry {
  const who = event.change.manager.id === meId ? 'Vous' : event.change.manager.displayName;
  const what =
    event.change.kind === 'joined'
      ? `${who === 'Vous' ? 'avez rejoint' : 'a rejoint'} ${event.zone.name}`
      : `${who === 'Vous' ? 'avez terminé votre' : 'a terminé son'} shift sur ${event.zone.name}`;
  return {
    key: `${event.at}-${event.change.kind}-${event.change.manager.id}`,
    at: event.at,
    text: `${who} ${what}`,
  };
}
