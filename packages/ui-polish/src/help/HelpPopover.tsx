import { useId, useState, type ReactNode } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  title: string;
  children: ReactNode;
  className?: string;
}

/** פופאובר עזרה — לחיצה על אייקון פותחת מידע נוסף. */
export function HelpPopover({ title, children, className }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={cn('relative inline-flex', className)} dir="rtl">
      <button
        type="button"
        aria-label="עזרה"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center text-muted hover:text-primary"
      >
        <HelpCircle className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          className="absolute top-full mt-1 right-0 z-40 w-72 rounded-lg border border-border bg-bg p-3 shadow-lg animate-fade-in"
        >
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-sm font-semibold">{title}</h4>
            <button
              type="button"
              aria-label="סגירה"
              onClick={() => setOpen(false)}
              className="text-muted hover:text-text"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="text-sm text-muted">{children}</div>
        </div>
      )}
    </span>
  );
}
