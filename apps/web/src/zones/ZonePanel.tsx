import type { Manager, Presence, ZoneOccupancy } from '@concordance/api-client';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
const hint = 'text-muted-foreground text-sm';

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
        <ul className="flex flex-col">
          {zone.managers.map((manager) => (
            <li key={manager.id}>
              <div
                className={cn(
                  'flex justify-between gap-2 py-1.5 text-sm',
                  manager.id === me.id && 'font-semibold',
                )}
              >
                <span>
                  {manager.displayName}
                  {manager.id === me.id && ' (vous)'}
                </span>
                <span className="text-muted-foreground font-mono text-xs">manager</span>
              </div>
              <Separator />
            </li>
          ))}
        </ul>
      ) : (
        <p className={hint}>Personne sur cette zone pour l'instant.</p>
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
          <p className={hint}>
            Vous êtes déjà sur {shiftZone?.name ?? 'une autre zone'}. Terminez ce shift pour changer
            de zone.
          </p>
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
        <p className={hint}>
          Hors ligne : inscription et fin de shift reprennent au retour du réseau.
        </p>
      )}
      {children}
    </aside>
  );
}
