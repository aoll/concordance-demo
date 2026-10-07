# concordance-demo

Démo pour l'entretien Tech Lead Concordance : une API NestJS modulaire, un typage de bout en bout jusqu'au front, une PWA responsive et de la présence en temps réel.

## Lancer

Prérequis : Node 22, pnpm 10 (`corepack enable`), Docker.

```bash
pnpm install
pnpm dev          # Postgres (Docker) + API (:3000) + front (:5173) + régénération du client
```

- Front : http://localhost:5173 (le proxy Vite envoie `/api` vers l'API)
- API : http://localhost:3000/api, Swagger : http://localhost:3000/docs
- Santé : http://localhost:3000/health (vérifie la base ; hors contrat)
- Front sur le faux back MSW, sans API : `pnpm --filter @concordance/web dev:mocks`
  (écritures ralenties de 600 ms pour voir l'optimisme ; `window.concordanceMocks.occupy('orly', 'Léa')` simule un autre manager)
- Preuve du parcours front (téléphone et tablette, captures dans `apps/web/front-proof`) : `pnpm --filter @concordance/web proof:front`

Au démarrage, l'API joue les migrations et le seed (idempotents) : les 6 zones de la carte et une quinzaine de managers en shift, comme dans la maquette (La Défense est pleine, Orly vide). Pour repartir d'une base vide : `pnpm db:down && docker volume rm concordance-demo_db-data`.

## Vérifier (la « CI » est locale)

```bash
pnpm check        # Biome, Postgres (Docker), puis typecheck, tests et build de tous les paquets
```

Les tests de l'API tournent sur une vraie base Postgres (`concordance_test`, recréée à chaque run sur le conteneur du docker compose), parce que les règles métier vivent en base : le verrou de capacité et l'index unique partiel ne se testent pas avec un mock.

## Base de données

Drizzle + PostgreSQL. Schéma dans `apps/api/src/database/schema.ts`, migrations SQL versionnées dans `apps/api/drizzle/` (`pnpm --filter @concordance/api db:generate` après un changement de schéma).

- `managers` : `display_name` unique, et des champs internes (email, matricule, téléphone) qui ne sortent jamais de l'API.
- `zones` : `slug` = id du `<path>` de la carte, `capacity > 0`.
- `presences` : `ended_at` null tant que le shift est en cours.

Les deux règles de la proposition sont garanties par Postgres :

1. **Un manager dans au plus une zone** : index unique partiel `presences(manager_id) WHERE ended_at IS NULL`.
2. **Une zone ne dépasse jamais sa capacité** : l'inscription est une transaction qui verrouille la ligne de la zone (`SELECT … FOR UPDATE`), compte les présences actives, puis insère. Deux inscriptions sur la même zone passent donc l'une après l'autre. Le test `presences.concurrency.spec.ts` lance 30 inscriptions simultanées sur une zone de capacité 3 et vérifie qu'il y en a exactement 3 ; sans le verrou, il en passe 4 à 6.

La connexion est paresseuse (le pool `pg` ne se connecte qu'à la première requête) : `pnpm generate` exporte le contrat sans base.

## Identité

Pas de vraie auth : `POST /api/auth/login { displayName }` crée le manager au premier passage et pose un cookie httpOnly `concordance_session` (JWT signé, 12 h). `AuthGuard` le lit et `@CurrentManager()` injecte le manager. La cible serait le SSO RATP (OIDC).

## Structure

```
apps/
  api/            NestJS : modules auth, zones, presences ; DTO en Zod (nestjs-zod)
  web/            Vite + React + TanStack Router (fichiers dans src/routes) + TanStack Query
packages/
  contracts/      code partagé hors OpenAPI : les 6 zones (slug = id du path SVG), événements WS
  api-client/     généré par Orval depuis le contrat : hooks TanStack Query, schémas Zod, mocks MSW
  tsconfig/       configurations TypeScript strictes partagées
docker-compose.yml  Postgres 17
```

## La chaîne du contrat

```
DTO Zod (apps/api) → openapi.json → Orval → packages/api-client → apps/web
```

1. Les DTO sont des schémas Zod (`createZodDto`). `ZodValidationPipe` valide les entrées, `@ZodResponse` filtre les sorties et documente la réponse.
2. `pnpm generate` construit l'API et écrit `apps/api/openapi.json` sans démarrer de serveur. En dev, l'API le réécrit à chaque redémarrage et `orval --watch` régénère le client.
3. Orval produit dans `packages/api-client/src/generated/` les hooks (`useListZones`, `useCreatePresence`…), les types (`ZoneOccupancy`, `Presence`…), des schémas Zod et des handlers MSW.
4. Un champ renommé dans un DTO casse donc la compilation du front.

`openapi.json` et `src/generated/` ne sont pas versionnés : Turborepo les régénère avant `typecheck`, `test`, `build` et `dev`.

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

Les erreurs métier suivent `ErrorResponse { statusCode, code, message }` ; le front lit `code`. Les erreurs de validation (400) gardent le format de nestjs-zod.
