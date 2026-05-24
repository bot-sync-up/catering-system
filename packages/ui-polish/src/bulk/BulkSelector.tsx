import { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';

interface Props {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

/** תיבת סימון עם מצב indeterminate — לבחירת "סמן הכל". */
export function BulkSelector({
  checked,
  indeterminate = false,
  onChange,
  label = 'בחירה',
  className,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2', className)} dir="rtl">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="h-4 w-4 cursor-pointer accent-primary"
      />
      <span className="sr-only">{label}</span>
    </label>
  );
}
