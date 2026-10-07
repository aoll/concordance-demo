# concordance-demo

Démo pour l'entretien Tech Lead Concordance : des managers RATP s'inscrivent sur une zone du réseau le temps de leur shift. Elle montre une API NestJS modulaire, un typage de bout en bout jusqu'au front, une capacité garantie par Postgres, la présence en temps réel et une PWA qui s'ouvre hors ligne.

La démo se montre sur la version déployée sur Railway (voir « Déploiement »), le lancement local sert de secours. Le déroulé en 5 minutes est dans [docs/demo.md](docs/demo.md).

## Lancer

Prérequis : Node 22, pnpm 10 (`corepack enable`), Docker.

```bash
pnpm install
pnpm demo         # Postgres (Docker), build de prod, API (:3000) et front (:4173)
```

Ouvrir http://localhost:4173. C'est le build de production, comme sur Railway : le service worker de la PWA n'est actif que sur le build.

Pour développer, `pnpm dev` lance Postgres, l'API en watch (:3000), le front Vite (:5173) et la régénération du client à chaque changement de DTO.

| Adresse | Contenu |
|---|---|
| http://localhost:3000/docs | Swagger |
| http://localhost:3000/health | Sonde de santé (vérifie la base, hors contrat) |

Au démarrage, l'API joue les migrations et le seed (idempotents) : dans une base vide, les 6 zones de la maquette et 14 managers en shift (La Défense est pleine, Orly vide). Ensuite, les zones vivent en base (nom, capacité, ordre, tracé sur le plan) : le front dessine ce que renvoie `GET /api/zones`, et le seed n'écrase jamais une zone existante. Pour revenir à cet état : `pnpm db:down && docker volume rm concordance-demo_db-data`.

## Architecture

```
            navigateur (PWA, téléphone ou tablette)
  ┌─────────────────────────────────────────────────────────┐
  │ apps/web  Vite + React + TanStack Router / Query        │
  │   hooks générés (packages/api-client)   socket.io-client│
  │   cache persisté dans IndexedDB, service worker Workbox │
  └──────────────┬──────────────────────────────┬───────────┘
          REST /api (cookie)          WebSocket /socket.io
  ┌──────────────┴──────────────────────────────┴───────────┐
  │ apps/api  NestJS                                        │
  │   AuthModule   ZonesModule   PresencesModule + Gateway  │
  │   DTO Zod (nestjs-zod)  →  openapi.json                 │
  └──────────────────────────┬──────────────────────────────┘
                             │ Drizzle
                     PostgreSQL 17 (Docker)

packages/contracts   l'événement WS et le tracé de zone en Zod, importés par l'API et le front
packages/api-client  généré par Orval depuis openapi.json : hooks, types, schémas Zod
packages/tsconfig    configurations TypeScript strictes partagées
```

Monorepo pnpm + Turborepo. Turbo régénère `openapi.json` et le client avant chaque `typecheck`, `test`, `build` et `dev` ; ces fichiers ne sont pas versionnés.

## Choix techniques

| Sujet | Choix | Pourquoi, et l'alternative assumée |
|---|---|---|
| Back | NestJS | Modules, injection, guards, pipes, filtres d'exception, gateway WebSocket et Swagger intégrés : c'est la structure qu'une squad de plusieurs développeurs partage. Hono est plus léger, mais il faudrait réinventer cette structure. |
| Validation | Zod via `nestjs-zod` | Un seul schéma valide l'entrée (`ZodValidationPipe`), filtre la sortie (`@ZodResponse` retire les champs non déclarés) et alimente le Swagger. |
| Contrat | OpenAPI → Orval | Le front ne déclare aucun type d'API à la main : un champ renommé dans un DTO casse sa compilation. |
| ORM | Drizzle | SQL explicite, utile pour la règle de capacité (verrou `FOR UPDATE`, index partiel). Prisma, plus répandu en ESN, se défend aussi. |
| Front | SPA Vite + TanStack | App interne authentifiée : pas de SSR ni de SEO. Le PWA de Next.js passe par Serwist, et les Server Components brouilleraient la démo du cache TanStack Query. |
| Temps réel | Gateway socket.io de Nest | Reconnexion et fallback fournis, même port que l'API. |
| Outillage | TypeScript strict, Biome, Vitest, Docker Compose | Biome remplace ESLint et Prettier en un outil. |

## Typage de bout en bout

```
DTO Zod (apps/api) → openapi.json → Orval → packages/api-client → apps/web
schéma Zod de l'événement WS (packages/contracts) → gateway Nest et hook du front
```

1. Les DTO sont des schémas Zod (`createZodDto`). Les services renvoient des lignes Drizzle, les contrôleurs des DTO : les champs internes du manager (email, matricule, téléphone) ne sortent jamais.
2. `pnpm generate` écrit `apps/api/openapi.json` sans démarrer de serveur ni de base.
3. Orval produit dans `packages/api-client/src/generated/` les hooks (`useListZones`, `useCreatePresence`…), les types (`ZoneOccupancy`, `Presence`…), et des schémas Zod.
4. OpenAPI ne décrit pas le WebSocket : l'événement `zone.occupancy.updated` est un schéma Zod de `packages/contracts`, qui type socket.io côté serveur et côté client. Le front le valide avant de toucher au cache.

Renommer `startedAt` en `startTime` dans `apps/api/src/presences/presences.dto.ts` (et son mapping dans `presences.service.ts`) fait échouer `pnpm typecheck` sur deux fichiers du front.

## Règles métier garanties en base

Schéma dans `apps/api/src/database/schema.ts`, migrations versionnées dans `apps/api/drizzle/`.

1. **Un manager dans au plus une zone** : index unique partiel `presences(manager_id) WHERE ended_at IS NULL`.
2. **Une zone ne dépasse jamais sa capacité** : l'inscription est une transaction qui verrouille la ligne de la zone (`SELECT … FOR UPDATE`), compte les présences actives, puis insère. Deux inscriptions sur la même zone passent l'une après l'autre. Le test `presences.concurrency.spec.ts` lance 30 inscriptions simultanées sur une zone de capacité 3 et vérifie qu'il en passe exactement 3 ; sans le verrou, il en passe 4 à 6.

Les services lèvent des erreurs métier (`ZoneFullError`…) sans connaître HTTP ; un filtre d'exception les traduit en `ErrorResponse { statusCode, code, message }` (409 `ZONE_FULL` ou `ALREADY_PRESENT`, 403, 404). Le front lit `code` pour afficher son message. Un middleware écrit une ligne de log par requête (méthode, route, statut, code métier, durée), refus du guard et de la validation compris.

La fin de shift est un `PATCH /presences/:id { status: "ENDED" }` et non un `DELETE` : on garde l'historique.

## Temps réel

Après le commit d'une inscription ou d'une fin de shift, `PresenceGateway` diffuse `zone.occupancy.updated` avec l'occupation complète de la zone. Le front (`apps/web/src/live/`) l'écrit dans le cache TanStack Query par `setQueryData`, sans refetch : la carte, le panneau et le fil « Activité en direct » suivent, et la zone clignote. L'événement porte l'état complet, donc l'appliquer deux fois ne change rien ; après une coupure, le front refetch une fois pour rattraper ce qu'il a manqué.

L'inscription elle-même est optimiste : la carte bouge avant la réponse, et un 409 annule la mise à jour avec un toast clair. Sur téléphone, le panneau est une bottom sheet qui liste les zones sous la carte ; sur tablette, il est à côté.

## PWA et hors ligne

- `vite-plugin-pwa` (Workbox) : manifest, icônes, shell précaché, `/api` en network-first (la dernière réponse connue sert si le réseau ne répond pas en 3 s).
- Le cache TanStack Query est persisté dans IndexedDB : l'app rouvre en mode avion avec la dernière occupation connue et un bandeau « Hors ligne ». En ligne, le cache restauré est revalidé aussitôt. La déconnexion purge ce cache. Hors ligne, l'inscription et la fin de shift sont désactivées.

## Identité

Pas de vraie authentification : `POST /api/auth/login { displayName }` crée le manager au premier passage et pose un cookie httpOnly `concordance_session` (JWT signé, 12 h). `AuthGuard` le lit et `@CurrentManager()` injecte le manager.

## Vérifier

La « CI » est locale :

```bash
pnpm check        # Biome, Postgres (Docker), puis typecheck, tests et build de tous les paquets
```

Les tests de l'API tournent sur une vraie base (`concordance_test`, recréée à chaque run), parce que le verrou de capacité et l'index partiel ne se testent pas avec un mock.

Trois scripts Playwright rejouent les parcours et prennent des captures (Chromium requis) :

| Commande (`pnpm --filter @concordance/web …`) | Ce qu'elle prouve |
|---|---|
| `proof:front` | Parcours complet sur la vraie API, téléphone et tablette, dont le 409 et son rollback (après `pnpm db:up && pnpm build`) |
| `proof:live` | Deux navigateurs sur la vraie API se mettent à jour sans recharger (après `pnpm db:up && pnpm build`) |
| `proof:pwa` | L'app rouvre hors ligne avec la dernière occupation (après `pnpm --filter @concordance/web build`) |

## Déploiement (Railway)

Une seule image (`Dockerfile`) : l'API Nest sert aussi le build de la PWA (`WEB_DIST_DIR`). Le REST, la socket et le cookie de session restent sur la même origine, comme avec le proxy Vite en local : ni CORS ni cookie cross-site. Railway fournit le HTTPS exigé par le service worker.

Le projet Railway contient un Postgres et le service `app`, construit depuis ce repo (`railway.json` : Dockerfile, sonde `/health`). Variables du service : `DATABASE_URL=${{Postgres.DATABASE_URL}}` et `JWT_SECRET` (l'API refuse de démarrer en production sans lui). Le port vient de `PORT`. Migrations et seed se jouent au démarrage.

Avant un entretien, vérifier l'URL publique sur deux appareils simulés :

```bash
APP_URL=https://<domaine>.up.railway.app pnpm --filter @concordance/web proof:deploy
```

## Contrat de l'API

| Méthode | Route | Hook | Réponse |
|---|---|---|---|
| POST | `/api/auth/login` `{ displayName }` | `useLogin` | `Session`, pose le cookie |
| GET | `/api/auth/session` | `useGetSession` | `Session` ou 401 |
| POST | `/api/auth/logout` | `useLogout` | 204 |
| GET | `/api/zones` | `useListZones` | `ZoneOccupancy[]` |
| GET | `/api/zones/:id` | `useGetZone` | `ZoneOccupancy` ou 404 |
| GET | `/api/presences?managerId=&zoneId=&active=` | `useListPresences` | `Presence[]` |
| POST | `/api/presences` `{ zoneId }` | `useCreatePresence` | 201 `Presence` ; 409 `ZONE_FULL` / `ALREADY_PRESENT` |
| PATCH | `/api/presences/:id` `{ status: "ENDED" }` | `useUpdatePresence` | `Presence` ; 403, 404, 409 `PRESENCE_ALREADY_ENDED` |

## Ce qu'on ferait en production

- **Identité** : le SSO RATP en OIDC à la place du pseudo, avec des rôles. Un superviseur pourrait clore le shift d'un autre manager avec le même `PATCH`, en élargissant seulement la règle d'autorisation.
- **Plusieurs instances** : l'adapter Redis de socket.io, pour que chaque instance diffuse les événements des autres.
- **Observabilité** : logs structurés (pino) avec un id de corrélation, traces et métriques OpenTelemetry, alertes sur les 409 et la latence de l'inscription.
- **Vraie carte** : MapLibre sur les données ouvertes d'Île-de-France Mobilités à la place du SVG schématique, et PostGIS si les zones deviennent dynamiques.
- **Shifts oubliés** : une expiration automatique après N heures (`@nestjs/schedule`).
- **Livraison** : une CI hébergée (lint, typecheck, tests sur Postgres, build), des migrations jouées au déploiement et non au démarrage, la vérification en CI que le client généré est à jour, et AsyncAPI pour documenter le WebSocket.
- **Hors ligne** : file d'inscriptions rejouées au retour du réseau (Background Sync), si le terrain le demande.
