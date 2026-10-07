import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { FeedEntry } from './apply';
import type { LiveStatus } from './source';

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: 'connexion…',
  live: 'en direct',
  offline: 'temps réel coupé',
};

const DOT: Record<LiveStatus, string> = {
  connecting: 'bg-muted-foreground',
  live: 'bg-free',
  offline: 'bg-full',
};

/** Pastille d'état de la connexion temps réel. */
export function LiveBadge({ status }: { status: LiveStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('live text-muted-foreground ml-auto gap-1.5 rounded-full', `live-${status}`)}
      data-testid="live-status"
      data-status={status}
    >
      <span className={cn('live-dot size-2 rounded-full', DOT[status])} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/** Fil « Activité en direct » : les derniers événements reçus, le plus récent en haut. */
export function LiveFeed({ entries }: { entries: FeedEntry[] }) {
  return (
    <Card className="gap-2 py-3 shadow-none" aria-label="Activité en direct" role="region">
      <CardHeader className="px-3">
        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Activité en direct
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        <ScrollArea className="h-32">
          <ol aria-live="polite" className="flex flex-col gap-1 pr-3 text-sm">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <li key={entry.key}>
                  <time
                    dateTime={entry.at}
                    className="text-muted-foreground mr-1.5 font-mono text-xs"
                  >
                    {hhmm(entry.at)}
                  </time>
                  {entry.text}
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">En attente du premier événement…</li>
            )}
          </ol>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
