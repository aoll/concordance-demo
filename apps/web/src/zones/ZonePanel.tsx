import type { Manager, Presence, ZoneOccupancy } from '@concordance/api-client';
import { Info, UserRound, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fillOf } from './fill';

interface ZonePanelProps {
  zone: ZoneOccupancy;
  me: Manager;
  shift: Presence | undefined;
  shiftZone: ZoneOccupancy | undefined;
  busy: boolean;
  offline: boolean;
  /** Téléphone : état de la bottom sheet (sans effet sur tablette). */
  sheetOpen: boolean;
  onToggleSheet: () => void;
  /** Liste des zones, affichée en tête de la bottom sheet sur téléphone. */
  list?: ReactNode;
  onJoin: () => void;
  onEnd: () => void;
  children?: ReactNode;
}

const action = 'h-11 w-full text-[0.95rem] font-semibold';

/** Détail d'une zone : remplissage, managers présents et action d'inscription. */
export function ZonePanel({
  zone,
  me,
  shift,
  shiftZone,
  busy,
  offline,
  sheetOpen,
  onToggleSheet,
  list,
  onJoin,
  onEnd,
  children,
}: ZonePanelProps) {
  const fill = fillOf(zone);
  const percent = Math.min(100, Math.round((zone.occupied / zone.capacity) * 100));
  const isMine = shift?.zoneId === zone.id;

  return (
    <aside className={sheetOpen ? 'panel open' : 'panel'} aria-live="polite">
      <Button
        variant="ghost"
        className="h-5 w-12 self-center p-0 hover:bg-transparent min-[720px]:hidden"
        aria-label={sheetOpen ? 'Replier le panneau' : 'Déplier le panneau'}
        aria-expanded={sheetOpen}
        onClick={onToggleSheet}
      >
        <span className="bg-border block h-1.5 w-10 rounded-full" />
      </Button>
      {list}
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-2xl leading-tight font-bold">{zone.name}</h2>
        <Badge
          className={cn(
            'bg-fill rounded-full border-transparent font-semibold tracking-wider text-white uppercase',
            `fill-${fill.key}`,
          )}
        >
          {fill.label}
        </Badge>
      </div>
      <div className="flex flex-col gap-1.5">
        <Progress
          value={percent}
          aria-label={`Remplissage de ${zone.name}`}
          className="bg-border"
          indicatorClassName={cn('bg-fill', `fill-${fill.key}`)}
        />
        <div className="text-muted-foreground font-mono text-sm tabular-nums">
          {zone.occupied} / {zone.capacity} places occupées
        </div>
      </div>

      {zone.managers.length > 0 ? (
        <Table aria-label={`Managers en shift sur ${zone.name}`}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground h-8 px-0 text-xs">En shift</TableHead>
              <TableHead className="text-muted-foreground h-8 px-0 text-right text-xs">
                Rôle
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zone.managers.map((manager) => (
              <TableRow key={manager.id} className={cn(manager.id === me.id && 'font-semibold')}>
                <TableCell className="px-0">
                  {manager.displayName}
                  {manager.id === me.id && ' (vous)'}
                </TableCell>
                <TableCell className="text-muted-foreground px-0 text-right font-mono text-xs">
                  manager
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Alert className="text-muted-foreground border-dashed bg-transparent">
          <UserRound />
          <AlertDescription>Personne sur cette zone pour l'instant.</AlertDescription>
        </Alert>
      )}

      {isMine ? (
        <Button className={action} onClick={onEnd} disabled={busy}>
          Terminer mon shift
        </Button>
      ) : shift ? (
        <>
          <Button className={action} disabled>
            Je m'inscris ici
          </Button>
          <Alert>
            <Info />
            <AlertDescription>
              Vous êtes déjà sur {shiftZone?.name ?? 'une autre zone'}. Terminez ce shift pour
              changer de zone.
            </AlertDescription>
          </Alert>
        </>
      ) : fill.key === 'full' ? (
        <Button className={action} disabled>
          Zone complète
        </Button>
      ) : (
        <Button className={action} onClick={onJoin} disabled={busy}>
          Je m'inscris ici
        </Button>
      )}
      {offline && (
        <Alert>
          <WifiOff />
          <AlertDescription>
            Hors ligne : inscription et fin de shift reprennent au retour du réseau.
          </AlertDescription>
        </Alert>
      )}
      {children}
    </aside>
  );
}
