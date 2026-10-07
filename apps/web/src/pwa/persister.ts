import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

/** How long the last known occupancy stays displayable offline. */
const MAX_AGE = 1000 * 60 * 60 * 24;

export function createQueryClient() {
  return new QueryClient({
    // gcTime must cover maxAge, otherwise restored queries would be discarded right away.
    defaultOptions: { queries: { gcTime: MAX_AGE } },
  });
}

/** TanStack Query cache serialized into IndexedDB: the app reopens offline with the latest data. */
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

/** Workbox cache for GET /api responses (network-first), named in vite.config.ts. */
export const API_CACHE = 'api';
