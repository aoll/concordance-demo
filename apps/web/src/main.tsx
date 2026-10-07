import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
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
      // The restored cache may lag by one event (1 s deferred save, disconnection):
      // we revalidate it right away, which refetches only once and does nothing offline.
      onSuccess={() => queryClient.invalidateQueries()}
    >
      <OfflineBanner />
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </PersistQueryClientProvider>
  </StrictMode>,
);
