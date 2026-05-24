import { cn } from '../utils/cn';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  'aria-label'?: string;
}

const roundedMap = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/** שלד טעינה עם shimmer בכיוון RTL (ימין לשמאל). */
export function Skeleton({
  width = '100%',
  height = '1rem',
  className,
  rounded = 'md',
  'aria-label': ariaLabel = 'טוען תוכן',
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={cn('skeleton-rtl', roundedMap[rounded], className)}
      style={{ width, height }}
    />
  );
}
