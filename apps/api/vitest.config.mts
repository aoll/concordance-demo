import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Integration tests run on a dedicated database, concordance_test, on the Postgres from
// docker compose. It is recreated on every run (src/test/global-setup.ts).
const devDatabaseUrl =
  process.env.DATABASE_URL ?? 'postgres://concordance:concordance@localhost:5432/concordance';
const testDatabaseUrl = new URL(devDatabaseUrl);
testDatabaseUrl.pathname = '/concordance_test';
process.env.DEV_DATABASE_URL = devDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl.toString();

// SWC rather than esbuild: Nest needs decorator metadata (injection by type).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts'],
    globalSetup: ['src/test/global-setup.ts'],
    env: { DATABASE_URL: testDatabaseUrl.toString(), NODE_ENV: 'test' },
    // A single shared database: files run one after the other.
    fileParallelism: false,
  },
});
