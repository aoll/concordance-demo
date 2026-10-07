# Deployment image (Railway): a single image, the Nest API also serves the PWA build.
# Same origin for REST, the socket and the session cookie: no CORS, no cross-site cookie.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# The front-end build regenerates the contract (openapi.json) and the Orval client: no database required.
RUN pnpm turbo run build --filter=@concordance/api --filter=@concordance/web

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    WEB_DIST_DIR=/app/apps/web/dist
COPY --from=build /app /app
# No root at runtime: the official image's node user, read-only on /app.
USER node
EXPOSE 3000
# Idempotent migrations and seed at API startup (see main.ts).
CMD ["node", "apps/api/dist/main.js"]
