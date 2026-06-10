import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton de una card de tema (misma silueta que la real: ícono, título, desc, barra). */
export function TopicCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-5 w-2/3" />
      <Skeleton className="mt-2 h-3.5 w-full" />
      <Skeleton className="mt-1.5 h-3.5 w-4/5" />
      <Skeleton className="mt-4 h-2 w-full rounded-full" />
    </div>
  );
}

/** Grilla de skeletons de temas. */
export function TopicGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TopicCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Fila de stat cards (avance, dominados, etc.). */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-5 shadow-soft">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="mt-4 h-7 w-20" />
          <Skeleton className="mt-1.5 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
