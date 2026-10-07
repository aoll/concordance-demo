import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
        <div className="font-heading flex items-center gap-2 text-lg font-bold tracking-wide">
          Concordance
          <Badge variant="secondary" className="font-sans tracking-widest uppercase">
            démo
          </Badge>
        </div>
        {manager && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="text-muted-foreground h-auto gap-2 rounded-full py-1 pr-1 pl-3 font-normal"
                aria-label={`Compte de ${manager.displayName}`}
              >
                {manager.displayName}
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials(manager.displayName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{manager.displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => logout.mutate()}>
                <LogOut />
                Se déconnecter (changer de pseudo)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      {isPending ? <PageSkeleton /> : manager ? <Outlet /> : <LoginScreen />}
    </div>
  );
}
