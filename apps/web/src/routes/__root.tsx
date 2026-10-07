import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1>Concordance</h1>
      <Outlet />
    </main>
  ),
});
