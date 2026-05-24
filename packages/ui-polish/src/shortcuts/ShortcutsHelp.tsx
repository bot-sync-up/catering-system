import { useMemo } from 'react';
import { X, Keyboard } from 'lucide-react';
import { formatCombo, type Shortcut } from '../hooks/useShortcuts';
import { cn } from '../utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
  className?: string;
}

/** דיאלוג עזרה המציג את כל קיצורי המקלדת מקובצים לפי group. */
export function ShortcutsHelp({ open, onClose, shortcuts, className }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, Shortcut[]>();
    for (const s of shortcuts) {
      const key = s.group ?? 'כללי';
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [shortcuts]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="קיצורי מקלדת"
      dir="rtl"
      className={cn(
        'fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 animate-fade-in',
        className,
      )}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-lg bg-bg shadow-xl flex flex-col">
        <header className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold">קיצורי מקלדת</h2>
          </div>
          <button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="rounded p-1 hover:bg-surface"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {groups.map(([group, list]) => (
            <section key={group}>
              <h3 className="mb-2 text-sm font-semibold text-muted">{group}</h3>
              <ul className="divide-y divide-border rounded-md border border-border bg-surface">
                {list.map((s) => (
                  <li key={s.combo} className="flex items-center justify-between gap-4 p-2.5 text-sm">
                    <span>{s.description}</span>
                    <kbd className="rounded border border-border bg-bg px-2 py-0.5 font-mono text-xs">
                      {formatCombo(s.combo)}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
