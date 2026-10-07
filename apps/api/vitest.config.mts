import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC plutôt qu'esbuild : Nest a besoin des métadonnées de décorateurs (injection par type).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts'],
  },
});
