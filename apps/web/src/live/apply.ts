import type { ZoneOccupancy } from '@concordance/api-client';
import type { ZoneOccupancyUpdated, ZoneSnapshot } from '@concordance/contracts';

/**
 * Remplace une zone du cache de `GET /zones` par l'instantané reçu en temps réel.
 * L'événement porte l'occupation complète : l'appliquer deux fois ne change rien.
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

/** Ligne du fil d'activité, formulée comme dans la maquette. */
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
