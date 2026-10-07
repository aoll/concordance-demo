import { ApiError, useListZones } from '@concordance/api-client';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

/** Écran provisoire du socle : prouve la chaîne contrat → hooks Orval. La carte arrive au lot 2c. */
function Home() {
  const zones = useListZones();

  if (zones.isPending) return <p>Chargement des zones…</p>;
  if (zones.isError) {
    const notYet = zones.error instanceof ApiError && zones.error.status === 501;
    return (
      <p role="alert">
        {notYet ? 'API branchée, routes encore en stub (501).' : 'API injoignable.'}
      </p>
    );
  }
  return (
    <ul>
      {zones.data.map((zone) => (
        <li key={zone.id} data-slug={zone.slug}>
          {zone.name} : {zone.occupied}/{zone.capacity}
        </li>
      ))}
    </ul>
  );
}
