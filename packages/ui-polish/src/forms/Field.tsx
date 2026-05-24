import { useId, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
}

/** עטיפת שדה — תווית + הערה + שגיאה, מקושר ב-ARIA. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1', className)} dir="rtl">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required && (
          <span className="ms-0.5 text-danger" aria-label="חובה">
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** סגנון בסיס לקלטים. */
export const inputBaseClass =
  'block w-full rounded-md border border-border bg-bg px-3 py-2 text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/30';
