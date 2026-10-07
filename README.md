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
- Front sur le faux back MSW, sans API : `pnpm --filter @concordance/web dev:mocks`
  (écritures ralenties de 600 ms pour voir l'optimisme ; `window.concordanceMocks.occupy('orly', 'Léa')` simule un autre manager)
- Preuve du parcours front (téléphone et tablette, captures dans `apps/web/front-proof`) : `pnpm --filter @concordance/web proof:front`

## Vérifier (la « CI » est locale)

```bash
pnpm check        # Biome, puis typecheck, tests et build de tous les paquets (Turborepo)
```

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
