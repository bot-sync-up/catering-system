import { Skeleton } from './Skeleton';

interface CardSkeletonProps {
  count?: number;
  withAvatar?: boolean;
  lines?: number;
}

/** שלד כרטיסים — לרשת/רשימת כרטיסים במהלך טעינה. */
export function CardSkeleton({ count = 3, withAvatar = false, lines = 3 }: CardSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="טוען כרטיסים"
      dir="rtl"
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            {withAvatar && <Skeleton width={48} height={48} rounded="full" />}
            <div className="flex-1 space-y-2">
              <Skeleton height="0.875rem" width="60%" />
              <Skeleton height="0.75rem" width="40%" />
            </div>
          </div>
          {Array.from({ length: lines }).map((_, j) => (
            <Skeleton key={j} height="0.75rem" width={j === lines - 1 ? '70%' : '100%'} />
          ))}
        </div>
      ))}
    </div>
  );
}
