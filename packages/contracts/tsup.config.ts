import { defineConfig } from 'tsup';

// Double sortie : ESM pour Vite (apps/web), CommonJS pour Nest (apps/api).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
});
