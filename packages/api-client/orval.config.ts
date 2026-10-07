import { defineConfig } from 'orval';

// Contrat écrit par l'API (apps/api/openapi.json) → hooks TanStack Query, mocks MSW, schémas Zod.
const input = '../../apps/api/openapi.json';

export default defineConfig({
  client: {
    input,
    output: {
      target: 'src/generated/endpoints',
      schemas: 'src/generated/model',
      mode: 'tags-split',
      client: 'react-query',
      httpClient: 'fetch',
      mock: { generators: [{ type: 'msw' }] },
      clean: true,
      override: {
        mutator: { path: 'src/fetcher.ts', name: 'customFetch' },
        // Les hooks renvoient directement le corps ; les erreurs passent par ApiError.
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
  zod: {
    input,
    output: {
      target: 'src/generated/zod',
      mode: 'tags-split',
      client: 'zod',
      fileExtension: '.zod.ts',
    },
  },
});
