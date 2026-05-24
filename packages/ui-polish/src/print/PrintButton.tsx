import { Printer } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  label?: string;
  className?: string;
  onBeforePrint?: () => void;
}

/** כפתור הדפסה — קורא ל-window.print עם hook אופציונלי. */
export function PrintButton({ label = 'הדפסה', className, onBeforePrint }: Props) {
  const handleClick = (): void => {
    onBeforePrint?.();
    window.print();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'no-print inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-border',
        className,
      )}
    >
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
