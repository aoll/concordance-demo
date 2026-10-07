# Image de déploiement (Railway) : une seule image, l'API Nest sert aussi le build de la PWA.
# Même origine pour le REST, la socket et le cookie de session : ni CORS ni cookie cross-site.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Le build du front régénère le contrat (openapi.json) et le client Orval : pas de base requise.
RUN pnpm turbo run build --filter=@concordance/api --filter=@concordance/web

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    WEB_DIST_DIR=/app/apps/web/dist
COPY --from=build /app /app
EXPOSE 3000
# Migrations et seed idempotents au démarrage de l'API (voir main.ts).
CMD ["node", "apps/api/dist/main.js"]
