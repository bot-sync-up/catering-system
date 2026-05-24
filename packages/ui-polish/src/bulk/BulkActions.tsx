import type { ReactNode } from 'react';
import { Download, Trash2, X, FileSpreadsheet } from 'lucide-react';
import { cn } from '../utils/cn';

interface Action {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void;
}

interface Props {
  count: number;
  onClear: () => void;
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onDelete?: () => void;
  extraActions?: Action[];
  itemNoun?: { singular: string; plural: string };
  className?: string;
}

/** סרגל פעולות לפריטים מסומנים — מופיע כאשר count > 0. */
export function BulkActions({
  count,
  onClear,
  onExportCSV,
  onExportExcel,
  onDelete,
  extraActions = [],
  itemNoun = { singular: 'פריט', plural: 'פריטים' },
  className,
}: Props) {
  if (count === 0) return null;
  const noun = count === 1 ? itemNoun.singular : itemNoun.plural;

  return (
    <div
      role="toolbar"
      aria-label="פעולות לפריטים נבחרים"
      dir="rtl"
      className={cn(
        'sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 shadow-sm',
        className,
      )}
    >
      <button
        type="button"
        aria-label="ניקוי הבחירה"
        onClick={onClear}
        className="inline-flex items-center gap-1 rounded p-1 hover:bg-primary/10"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <span className="text-sm font-medium">
        נבחרו {count} {noun}
      </span>
      <div className="mx-1 h-5 w-px bg-border" />
      {onExportCSV && (
        <button
          type="button"
          onClick={onExportCSV}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-primary/10"
        >
          <Download className="h-4 w-4" aria-hidden />
          CSV
        </button>
      )}
      {onExportExcel && (
        <button
          type="button"
          onClick={onExportExcel}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-primary/10"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden />
          Excel
        </button>
      )}
      {extraActions.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={a.onClick}
          className={cn(
            'inline-flex items-center gap-1 rounded px-2 py-1 text-sm',
            a.variant === 'danger'
              ? 'text-danger hover:bg-danger/10'
              : 'hover:bg-primary/10',
          )}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-danger hover:bg-danger/10 ms-auto"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          מחיקה
        </button>
      )}
    </div>
  );
}
