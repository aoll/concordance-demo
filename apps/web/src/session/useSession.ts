import {
  getGetSessionQueryKey,
  type Manager,
  useGetSession,
  useLogin,
  useLogout,
} from '@concordance/api-client';
import { useQueryClient } from '@tanstack/react-query';

/** Session courante : un 401 n'est pas une erreur à réessayer, c'est « pas connecté ». */
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
      // On repart d'un cache vide : la session refetchée renvoie 401 et affiche l'écran de connexion.
      onSuccess: () => queryClient.resetQueries(),
    },
  });
}
