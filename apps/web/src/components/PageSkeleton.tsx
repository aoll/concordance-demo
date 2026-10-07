import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton while the session is being read: the layout appears before the data. */
export function PageSkeleton() {
  return (
    <div className="grid gap-3 p-4" aria-busy="true">
      <span className="sr-only">Chargement…</span>
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
