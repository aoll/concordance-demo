import type { FeedEntry } from './apply';
import type { LiveStatus } from './source';

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: 'connexion…',
  live: 'en direct',
  offline: 'temps réel coupé',
};

/** Pastille d'état de la connexion temps réel. */
export function LiveBadge({ status }: { status: LiveStatus }) {
  return (
    <span className={`live live-${status}`} data-testid="live-status" data-status={status}>
      <i className="live-dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Fil « Activité en direct » : les derniers événements reçus, le plus récent en haut. */
export function LiveFeed({ entries }: { entries: FeedEntry[] }) {
  return (
    <section className="feed" aria-label="Activité en direct">
      <h3>Activité en direct</h3>
      <ol aria-live="polite">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <li key={entry.key}>
              <time dateTime={entry.at}>{hhmm(entry.at)}</time>
              {entry.text}
            </li>
          ))
        ) : (
          <li className="empty">En attente du premier événement…</li>
        )}
      </ol>
    </section>
  );
}
