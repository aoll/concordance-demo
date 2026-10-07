import { defineConfig } from 'drizzle-kit';

// `pnpm --filter @concordance/api db:generate` writes a SQL migration from the schema.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/*/*.schema.ts',
  out: './drizzle',
});
