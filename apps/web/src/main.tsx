import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OfflineBanner } from './pwa/OfflineBanner';
import { createQueryClient, persistOptions } from './pwa/persister';
import { routeTree } from './routeTree.gen';
import './styles.css';

const queryClient = createQueryClient();
const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable');
createRoot(root).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      // Le cache restauré peut retarder d'un événement (sauvegarde différée d'1 s, coupure) :
      // on le revalide aussitôt, ce qui ne refetch qu'une fois et ne fait rien hors ligne.
      onSuccess={() => queryClient.invalidateQueries()}
    >
      <OfflineBanner />
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
