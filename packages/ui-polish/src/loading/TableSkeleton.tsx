import { Skeleton } from './Skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

/** שלד טבלה — מציג שורות וטורים מדומים בזמן טעינה. */
export function TableSkeleton({ rows = 6, columns = 4, showHeader = true }: TableSkeletonProps) {
  return (
    <div role="status" aria-label="טוען טבלה" dir="rtl" className="w-full overflow-hidden">
      {showHeader && (
        <div className="grid gap-3 border-b border-border bg-surface p-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`h-${i}`} height="1rem" width="75%" />
          ))}
        </div>
      )}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={`r-${r}`}
            className="grid gap-3 p-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={`c-${r}-${c}`} height="0.875rem" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
