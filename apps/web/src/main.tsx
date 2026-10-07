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

async function start() {
  if (import.meta.env.VITE_API_MOCKS === 'true') {
    // Faux back MSW généré depuis le contrat : le front avance sans l'API réelle.
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
  const root = document.getElementById('root');
  if (!root) throw new Error('#root introuvable');
  createRoot(root).render(
    <StrictMode>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <OfflineBanner />
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    </StrictMode>,
  );
}

void start();
