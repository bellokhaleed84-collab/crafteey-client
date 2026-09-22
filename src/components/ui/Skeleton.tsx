export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-muted ${className}`} />;
}

/** Generic list-row skeleton: icon + a few lines of text. */
export function SkeletonListCard() {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-card">
      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}

/** Renders N stacked skeleton rows. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListCard key={i} />
      ))}
    </div>
  );
}

/** Safe default for any page body with no custom shape. */
export function PageSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <SkeletonList count={3} />
    </div>
  );
}

/** Detail page: title block + a status/content card. */
export function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}

/** Full-screen centered spinner-replacement, for auth/redirect gates. */
export function FullScreenSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-3 px-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}