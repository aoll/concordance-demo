import {
  getGetSessionQueryKey,
  type Manager,
  useGetSession,
  useLogin,
  useLogout,
} from '@concordance/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_CACHE, persistOptions } from '../pwa/persister';

/** Current session: a 401 is not an error to retry, it means "not logged in". */
export function useSession() {
  const session = useGetSession({ query: { retry: false, staleTime: Number.POSITIVE_INFINITY } });
  const manager: Manager | undefined = session.data?.manager;
  return { manager, isPending: session.isPending };
}

export function useLoginByPseudo() {
  const queryClient = useQueryClient();
  return useLogin({
    mutation: {
      onSuccess: (session) => queryClient.setQueryData(getGetSessionQueryKey(), session),
    },
  });
}

export function useLogoutAndReset() {
  const queryClient = useQueryClient();
  return useLogout({
    mutation: {
      // We start over from an empty cache, including the offline copy in IndexedDB (otherwise the next
      // manager would see the previous one's data); the refetched session returns 401 → login.
      onSuccess: async () => {
        await persistOptions.persister.removeClient();
        // And the API responses kept by the service worker (this manager's shifts).
        if ('caches' in window) await caches.delete(API_CACHE);
        await queryClient.resetQueries();
      },
    },
  });
}
