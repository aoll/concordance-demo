import { defineConfig } from 'orval';

// Contract written by the API (apps/api/openapi.json) → TanStack Query hooks, Zod schemas.
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
      clean: true,
      override: {
        mutator: { path: 'src/fetcher.ts', name: 'customFetch' },
        // Hooks return the body directly; errors go through ApiError.
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
