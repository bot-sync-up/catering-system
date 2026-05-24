import { cn } from '../utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  indeterminate?: boolean;
  className?: string;
}

const variantMap = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

/** סרגל התקדמות RTL — מתמלא מימין לשמאל. */
export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  variant = 'default',
  indeterminate = false,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full', className)} dir="rtl">
      {(label || showPercentage) && (
        <div className="flex items-baseline justify-between mb-1 text-sm">
          {label && <span className="text-text">{label}</span>}
          {showPercentage && !indeterminate && (
            <span className="text-muted tabular-nums">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : value}
        aria-label={label ?? 'התקדמות'}
        className="h-2 w-full overflow-hidden rounded-full bg-border"
      >
        {indeterminate ? (
          <div
            className={cn(
              'h-full w-1/3 animate-pulse-soft rounded-full',
              variantMap[variant],
            )}
          />
        ) : (
          <div
            className={cn('h-full rounded-full transition-all duration-300', variantMap[variant])}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}
