import { useEffect, type ReactNode } from 'react';
import { X, Printer } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** תצוגה מקדימה להדפסה — מציג את התוכן בדף A4 מדומה לפני הדפסה אמיתית. */
export function PrintPreview({ open, onClose, title = 'תצוגה מקדימה', children, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      dir="rtl"
      className={cn(
        'fixed inset-0 z-[130] flex flex-col bg-black/70 animate-fade-in',
        className,
      )}
    >
      <header className="no-print flex items-center justify-between bg-surface px-4 py-2 border-b border-border">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-fg hover:bg-primary-hover"
          >
            <Printer className="h-4 w-4" aria-hidden />
            הדפס
          </button>
          <button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="rounded-md border border-border bg-bg p-1.5 hover:bg-surface"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <div
          className="mx-auto bg-white text-black shadow-2xl"
          style={{
            width: '21cm',
            minHeight: '29.7cm',
            padding: '1.5cm',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
