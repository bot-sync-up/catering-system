import { cn } from '../utils/cn';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

const sizeMap = {
  xs: 'h-3 w-3 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-[3px]',
  lg: 'h-10 w-10 border-4',
  xl: 'h-16 w-16 border-4',
};

/** ספינר טעינה — מסתובב נגד כיוון השעון בכיווניות RTL. */
export function Spinner({ size = 'md', label = 'טוען...', className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <div
        className={cn(
          'rounded-full border-border border-t-primary animate-spin',
          sizeMap[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
