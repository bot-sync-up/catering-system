import { Skeleton } from './Skeleton';

interface FormSkeletonProps {
  fields?: number;
  showSubmit?: boolean;
}

/** שלד טופס — שדות+כפתור שליחה. */
export function FormSkeleton({ fields = 5, showSubmit = true }: FormSkeletonProps) {
  return (
    <div role="status" aria-label="טוען טופס" dir="rtl" className="space-y-4 max-w-2xl">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton height="0.75rem" width="25%" />
          <Skeleton height="2.5rem" />
        </div>
      ))}
      {showSubmit && (
        <div className="flex justify-end pt-2">
          <Skeleton height="2.5rem" width="8rem" />
        </div>
      )}
    </div>
  );
}
