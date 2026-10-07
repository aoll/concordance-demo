import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { LoginScreen } from '../session/LoginScreen';
import { useLogoutAndReset, useSession } from '../session/useSession';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
});

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function Root() {
  const { manager, isPending } = useSession();
  const logout = useLogoutAndReset();

  return (
    <div className="app-shell">
      <header className="appbar">
        <div className="brand">
          Concordance<small>démo</small>
        </div>
        {manager && (
          <div className="me">
            <span>{manager.displayName}</span>
            <button
              type="button"
              className="avatar"
              title="Changer de pseudo"
              aria-label={`Déconnecter ${manager.displayName}`}
              onClick={() => logout.mutate()}
            >
              {initials(manager.displayName)}
            </button>
          </div>
        )}
      </header>
      {isPending ? <p className="loading">Chargement…</p> : manager ? <Outlet /> : <LoginScreen />}
    </div>
  );
}
