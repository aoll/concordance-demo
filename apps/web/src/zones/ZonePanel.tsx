import type { Manager, Presence, ZoneOccupancy } from '@concordance/api-client';
import type { ReactNode } from 'react';
import { fillOf } from './fill';

interface ZonePanelProps {
  zone: ZoneOccupancy;
  me: Manager;
  shift: Presence | undefined;
  shiftZone: ZoneOccupancy | undefined;
  busy: boolean;
  /** Téléphone : état de la bottom sheet (sans effet sur tablette). */
  sheetOpen: boolean;
  onToggleSheet: () => void;
  /** Liste des zones, affichée en tête de la bottom sheet sur téléphone. */
  list?: ReactNode;
  onJoin: () => void;
  onEnd: () => void;
  children?: ReactNode;
}

/** Détail d'une zone : remplissage, managers présents et action d'inscription. */
export function ZonePanel({
  zone,
  me,
  shift,
  shiftZone,
  busy,
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
      <button
        type="button"
        className="grip"
        aria-label={sheetOpen ? 'Replier le panneau' : 'Déplier le panneau'}
        aria-expanded={sheetOpen}
        onClick={onToggleSheet}
      />
      {list}
      <div className="zhead">
        <h2>{zone.name}</h2>
        <span className={`pill fill-${fill.key}`}>{fill.label}</span>
      </div>
      <div>
        <div className="meter">
          <i className={`fill-${fill.key}`} style={{ width: `${percent}%` }} />
        </div>
        <div className="cap">
          {zone.occupied} / {zone.capacity} places occupées
        </div>
      </div>

      {zone.managers.length > 0 ? (
        <ul className="list">
          {zone.managers.map((manager) => (
            <li key={manager.id} className={manager.id === me.id ? 'you' : undefined}>
              <span>
                {manager.displayName}
                {manager.id === me.id && ' (vous)'}
              </span>
              <span>manager</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Personne sur cette zone pour l'instant.</p>
      )}

      {isMine ? (
        <button type="button" className="btn" onClick={onEnd} disabled={busy}>
          Terminer mon shift
        </button>
      ) : shift ? (
        <>
          <button type="button" className="btn" disabled>
            Je m'inscris ici
          </button>
          <p className="hint">
            Vous êtes déjà sur {shiftZone?.name ?? 'une autre zone'}. Terminez ce shift pour changer
            de zone.
          </p>
        </>
      ) : fill.key === 'full' ? (
        <button type="button" className="btn" disabled>
          Zone complète
        </button>
      ) : (
        <button type="button" className="btn" onClick={onJoin} disabled={busy}>
          Je m'inscris ici
        </button>
      )}
      {children}
    </aside>
  );
}
