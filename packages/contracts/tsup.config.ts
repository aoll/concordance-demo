import { defineConfig } from 'tsup';

// Dual output: ESM for Vite (apps/web), CommonJS for Nest (apps/api).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
});
