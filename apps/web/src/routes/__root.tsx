import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
      <header className="flex items-center justify-between gap-2.5 border-b px-4 pt-[calc(12px+env(safe-area-inset-top,0px))] pb-3">
        <div className="font-heading text-lg font-bold tracking-wide">
          Concordance
          <small className="text-muted-foreground ml-1.5 font-sans text-[0.7rem] font-medium tracking-widest uppercase">
            démo
          </small>
        </div>
        {manager && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>{manager.displayName}</span>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full p-0"
              title="Changer de pseudo"
              aria-label={`Déconnecter ${manager.displayName}`}
              onClick={() => logout.mutate()}
            >
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials(manager.displayName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        )}
      </header>
      {isPending ? (
        <p className="text-muted-foreground px-4 py-6">Chargement…</p>
      ) : manager ? (
        <Outlet />
      ) : (
        <LoginScreen />
      )}
    </div>
  );
}
