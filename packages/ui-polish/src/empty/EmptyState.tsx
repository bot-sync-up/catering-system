import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { wrapper: 'py-8 gap-2', icon: 'h-10 w-10', title: 'text-base' },
  md: { wrapper: 'py-12 gap-3', icon: 'h-14 w-14', title: 'text-lg' },
  lg: { wrapper: 'py-16 gap-4', icon: 'h-20 w-20', title: 'text-xl' },
};

/** רכיב כללי למצבים ריקים — לוגיקה+טקסט+פעולה. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className,
}: EmptyStateProps) {
  const s = sizeMap[size];
  return (
    <div
      role="status"
      dir="rtl"
      className={cn('flex flex-col items-center justify-center text-center', s.wrapper, className)}
    >
      {icon && (
        <div className={cn('text-muted', s.icon)} aria-hidden>
          {icon}
        </div>
      )}
      <h3 className={cn('font-semibold text-text', s.title)}>{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
