import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

/** Durée pendant laquelle la dernière occupation connue reste affichable hors ligne. */
const MAX_AGE = 1000 * 60 * 60 * 24;

export function createQueryClient() {
  return new QueryClient({
    // gcTime doit couvrir maxAge, sinon les requêtes restaurées seraient aussitôt jetées.
    defaultOptions: { queries: { gcTime: MAX_AGE } },
  });
}

/** Cache TanStack Query sérialisé dans IndexedDB : l'app rouvre hors ligne avec les dernières données. */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({
    storage: {
      getItem: (key) => get<string>(key).then((value) => value ?? null),
      setItem: (key, value) => set(key, value),
      removeItem: (key) => del(key),
    },
    key: 'concordance-query-cache',
  }),
  maxAge: MAX_AGE,
};

/** Cache Workbox des réponses GET /api (network-first), nommé dans vite.config.ts. */
export const API_CACHE = 'api';
