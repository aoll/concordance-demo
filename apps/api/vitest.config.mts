import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Les tests d'intégration tournent sur une base dédiée, concordance_test, sur le Postgres du
// docker compose. Elle est recréée à chaque run (src/test/global-setup.ts).
const devDatabaseUrl =
  process.env.DATABASE_URL ?? 'postgres://concordance:concordance@localhost:5432/concordance';
const testDatabaseUrl = new URL(devDatabaseUrl);
testDatabaseUrl.pathname = '/concordance_test';
process.env.DEV_DATABASE_URL = devDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl.toString();

// SWC plutôt qu'esbuild : Nest a besoin des métadonnées de décorateurs (injection par type).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts'],
    globalSetup: ['src/test/global-setup.ts'],
    env: { DATABASE_URL: testDatabaseUrl.toString(), NODE_ENV: 'test' },
    // Une seule base partagée : les fichiers passent l'un après l'autre.
    fileParallelism: false,
  },
});
