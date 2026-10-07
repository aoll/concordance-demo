import { ZONES, type ZoneOccupancyUpdated } from '@concordance/contracts';
import { delay, HttpResponse } from 'msw';
import {
  getGetSessionMockHandler,
  getLoginMockHandler,
  getLogoutMockHandler,
} from './generated/endpoints/auth/auth.msw';
import {
  getCreatePresenceMockHandler,
  getListPresencesMockHandler,
  getUpdatePresenceMockHandler,
} from './generated/endpoints/presences/presences.msw';
import {
  getGetZoneMockHandler,
  getListZonesMockHandler,
} from './generated/endpoints/zones/zones.msw';
import type { ErrorResponse, Manager, Presence, ZoneOccupancy } from './generated/model';

export * from './generated/endpoints/auth/auth.msw';
export * from './generated/endpoints/presences/presences.msw';
export * from './generated/endpoints/zones/zones.msw';

/**
 * Faux back en mémoire pour développer le front avant l'API réelle (VITE_API_MOCKS=true).
 * Il réutilise les handlers générés par Orval : ses réponses sont donc typées par le contrat.
 * Il suit les règles métier de la proposition : capacité, une présence active par manager,
 * fin de shift réservée à son auteur.
 *
 * `latency` retarde les écritures pour rendre visible la mise à jour optimiste du front.
 * `onEvent` reçoit les événements temps réel qu'émettrait la gateway (zone.occupancy.updated).
 */
export function createMockApi({
  latency = 0,
  onEvent,
}: {
  latency?: number;
  onEvent?: (event: ZoneOccupancyUpdated) => void;
} = {}) {
  const uuid = () => crypto.randomUUID();
  const zones = ZONES.map((zone) => ({ ...zone, id: uuid() }));
  const managers = new Map<string, Manager>();
  let presences: Presence[] = [];
  let session: Manager | null = null;

  const fail = (statusCode: number, code: ErrorResponse['code'], message: string): never => {
    throw HttpResponse.json<ErrorResponse>({ statusCode, code, message }, { status: statusCode });
  };
  const currentManager = (): Manager =>
    session ?? fail(401, 'UNAUTHENTICATED', 'Connectez-vous avec un pseudo.');
  const active = () => presences.filter((presence) => presence.endedAt === null);
  const occupancy = (zone: (typeof zones)[number]): ZoneOccupancy => {
    const here = active().filter((presence) => presence.zoneId === zone.id);
    return {
      id: zone.id,
      slug: zone.slug,
      name: zone.name,
      capacity: zone.capacity,
      occupied: here.length,
      managers: here.flatMap((presence) => managers.get(presence.managerId) ?? []),
    };
  };
  const emit = (kind: 'joined' | 'left', manager: Manager, zoneId: string) => {
    const zone = zones.find((candidate) => candidate.id === zoneId);
    if (zone && onEvent) {
      onEvent({ zone: occupancy(zone), change: { kind, manager }, at: new Date().toISOString() });
    }
  };
  const join = (manager: Manager, zoneId: string): Presence => {
    const zone = zones.find((candidate) => candidate.id === zoneId);
    if (!zone) return fail(404, 'NOT_FOUND', 'Zone inconnue.');
    if (active().some((presence) => presence.managerId === manager.id)) {
      return fail(409, 'ALREADY_PRESENT', 'Vous avez déjà un shift en cours.');
    }
    if (occupancy(zone).occupied >= zone.capacity) {
      return fail(409, 'ZONE_FULL', 'Cette zone est complète.');
    }
    const presence: Presence = {
      id: uuid(),
      managerId: manager.id,
      zoneId: zone.id,
      startedAt: new Date().toISOString(),
      endedAt: null,
    };
    presences = [...presences, presence];
    emit('joined', manager, zone.id);
    return presence;
  };
  const leave = (presence: Presence): Presence => {
    const ended = { ...presence, endedAt: new Date().toISOString() };
    presences = presences.map((candidate) => (candidate.id === ended.id ? ended : candidate));
    const manager = managers.get(presence.managerId);
    if (manager) emit('left', manager, presence.zoneId);
    return ended;
  };

  // Occupation de départ, reprise de la maquette.
  const seed: Record<string, string[]> = {
    'paris-rive-droite': ['Karim B.', 'Sophie T.', 'Julien R.'],
    'paris-rive-gauche': ['Nadia K.', 'Thomas G.', 'Léa M.', 'Hugo P.', 'Inès D.'],
    'la-defense': ['Marc V.', 'Claire F.', 'Yanis O.'],
    'saint-denis': ['Fatou S.'],
    'marne-la-vallee': ['Paul N.', 'Emma C.'],
  };
  for (const zone of zones) {
    for (const displayName of seed[zone.slug] ?? []) {
      const manager = { id: uuid(), displayName };
      managers.set(manager.id, manager);
      join(manager, zone.id);
    }
  }

  const handlers = [
    getLoginMockHandler(async ({ request }) => {
      const { displayName } = (await request.json()) as { displayName: string };
      const existing = [...managers.values()].find((m) => m.displayName === displayName);
      session = existing ?? { id: uuid(), displayName };
      managers.set(session.id, session);
      return { manager: session };
    }),
    getGetSessionMockHandler(() => ({ manager: currentManager() })),
    getLogoutMockHandler(() => {
      session = null;
    }),
    getListZonesMockHandler(() => zones.map(occupancy)),
    getGetZoneMockHandler(({ params }) => {
      const zone = zones.find((candidate) => candidate.id === params.id);
      return zone ? occupancy(zone) : fail(404, 'NOT_FOUND', 'Zone inconnue.');
    }),
    getListPresencesMockHandler(({ request }) => {
      currentManager();
      const query = new URL(request.url).searchParams;
      return presences.filter(
        (presence) =>
          (!query.get('managerId') || presence.managerId === query.get('managerId')) &&
          (!query.get('zoneId') || presence.zoneId === query.get('zoneId')) &&
          (query.get('active') !== 'true' || presence.endedAt === null) &&
          (query.get('active') !== 'false' || presence.endedAt !== null),
      );
    }),
    getCreatePresenceMockHandler(async ({ request }) => {
      const { zoneId } = (await request.json()) as { zoneId: string };
      await delay(latency);
      return join(currentManager(), zoneId);
    }),
    getUpdatePresenceMockHandler(async ({ params }) => {
      await delay(latency);
      const manager = currentManager();
      const presence = presences.find((candidate) => candidate.id === params.id);
      if (!presence) return fail(404, 'NOT_FOUND', 'Présence inconnue.');
      if (presence.managerId !== manager.id) {
        return fail(403, 'FORBIDDEN', 'Cette présence appartient à un autre manager.');
      }
      if (presence.endedAt)
        return fail(409, 'PRESENCE_ALREADY_ENDED', 'Ce shift est déjà terminé.');
      return leave(presence);
    }),
  ];

  /** Inscrit un autre manager, comme le ferait un second navigateur (démo d'une zone pleine). */
  const occupy = (slug: string, displayName: string): Presence => {
    const zone = zones.find((candidate) => candidate.slug === slug);
    if (!zone) throw new Error(`Zone inconnue : ${slug}`);
    const manager = { id: uuid(), displayName };
    managers.set(manager.id, manager);
    try {
      return join(manager, zone.id);
    } catch {
      throw new Error(`Impossible d'inscrire ${displayName} sur ${slug}`);
    }
  };

  /** Fin de shift d'un autre manager, comme dans un second navigateur. */
  const release = (slug: string, displayName: string): Presence => {
    const zone = zones.find((candidate) => candidate.slug === slug);
    const presence = active().find(
      (candidate) =>
        candidate.zoneId === zone?.id &&
        managers.get(candidate.managerId)?.displayName === displayName,
    );
    if (!presence) throw new Error(`${displayName} n'est pas en shift sur ${slug}`);
    return leave(presence);
  };

  return { handlers, zones, occupy, release };
}
