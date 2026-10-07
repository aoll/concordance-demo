import { defineConfig } from 'drizzle-kit';

// `pnpm --filter @concordance/api db:generate` écrit une migration SQL à partir du schéma.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
});
