# Scénario de démo (5 minutes)

## Avant l'entretien

La démo se fait sur la version déployée sur Railway : une URL publique en HTTPS, la même image que l'on décrit dans le README.

1. Vérifier le déploiement : `APP_URL=https://<domaine>.up.railway.app pnpm --filter @concordance/web proof:deploy`. Il laisse ses shifts de test terminés ; après une répétition, terminer aussi les shifts d'Alex et de Kenza pour retrouver l'occupation de la maquette (Orly vide, La Défense pleine).
2. Ouvrir l'URL Railway dans deux fenêtres Chrome côte à côte :
   - à gauche, une fenêtre normale en mode responsive « iPad » (DevTools) : la **tablette d'Alex** ;
   - à droite, une fenêtre de navigation privée en mode « Pixel 7 » : le **téléphone de Kenza** (le cookie de session est séparé).
3. Garder un terminal ouvert à la racine du repo, et l'éditeur sur `apps/api/src/presences/presences.dto.ts`. Le test de concurrence (2:15) tourne en local sur Postgres : lancer `pnpm db:up` avant.

## Déroulé

| Temps | Action | Ce qu'on montre, ce qu'on dit |
|---|---|---|
| 0:00 | Sur la tablette, entrer « Alex L. ». | Pas de vraie auth : un pseudo, un cookie httpOnly JWT, un `AuthGuard` Nest. En production, le SSO RATP en OIDC. |
| 0:30 | Montrer la carte et toucher La Défense. | Les zones viennent de la base (tracé compris) et sont dessinées sur un plan SVG schématique, colorées selon le remplissage. La Défense est complète (3/3), le bouton est désactivé. |
| 1:00 | Sur le téléphone, entrer « Kenza A. », ouvrir Orly, « Je m'inscris ici ». | Le téléphone passe à 1/3 avant la réponse (mise à jour optimiste). Sur la tablette, Orly clignote, passe à 1/3 et le fil « Activité en direct » affiche « Kenza A. a rejoint Orly », sans recharger : l'événement socket.io est écrit dans le cache TanStack Query. |
| 1:45 | Sur la tablette, s'inscrire sur Orly (2/3), puis ouvrir Saint-Denis. | Le bandeau « En shift sur Orly » apparaît. Saint-Denis refuse : « Vous êtes déjà sur Orly ». Un manager n'est que dans une zone, garanti par un index unique partiel. |
| 2:15 | Dans le terminal : `pnpm --filter @concordance/api exec vitest run presences.concurrency`. | La capacité est garantie par Postgres, pas par le front : 30 inscriptions simultanées sur une zone de 3, il en passe exactement 3 (`SELECT … FOR UPDATE` sur la zone). Si une inscription perd la course, l'API répond 409 `ZONE_FULL` et le front annule sa mise à jour optimiste avec un message. |
| 3:00 | Sur le téléphone, « Terminer mon shift ». | Orly redescend à 1/3 sur les deux écrans. La fin de shift est un `PUT /presences/:id/status` avec `status: "ENDED"`, pas un `DELETE` : on garde l'historique. Le PUT est idempotent : rejouer après une réponse perdue renvoie 200. |
| 3:30 | Sur le téléphone : DevTools, onglet Network, « Offline », puis recharger. | Bandeau « Hors ligne » et dernière occupation connue : shell en cache par le service worker, cache TanStack Query persisté dans IndexedDB. Repasser en ligne : la carte se resynchronise. |
| 4:15 | Dans l'éditeur, renommer `startedAt` en `startTime` dans `presences.dto.ts` et à la ligne du mapping dans `presences.service.ts`, puis `pnpm typecheck`. | Le front ne compile plus (`ShiftBanner.tsx`, `shift/cache.ts`) : un seul contrat, du DTO Zod au hook généré par Orval. Annuler avec `git checkout apps/api`. |
| 4:45 | Conclure sur le README, section « Ce qu'on ferait en production ». | SSO OIDC, adapter Redis pour plusieurs instances, observabilité, vraie carte MapLibre sur les données IDFM. |

## Si quelque chose casse

- Railway injoignable : basculer en local. `pnpm db:down && docker volume rm concordance-demo_db-data` pour repartir de la maquette, puis `pnpm demo` et ouvrir http://localhost:4173 (Docker requis). Le déroulé est identique.
- En local, port 3000, 4173 ou 5432 déjà pris : arrêter l'autre processus, ou `pnpm db:down` puis relancer.
