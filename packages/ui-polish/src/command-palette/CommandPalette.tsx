import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { stripNikud } from '../utils/hebrew';
import { formatCombo } from '../hooks/useShortcuts';
import { cn } from '../utils/cn';
import type { Command } from './commands';

interface Props {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
  emptyMessage?: string;
}

function fuzzyMatch(needle: string, haystack: string): boolean {
  if (!needle) return true;
  const n = stripNikud(needle.toLowerCase().trim());
  const h = stripNikud(haystack.toLowerCase());
  let i = 0;
  for (const ch of h) {
    if (ch === n[i]) i++;
    if (i === n.length) return true;
  }
  return h.includes(n);
}

/** לוח פקודות בסגנון Cmd+K — חיפוש חי, ניווט בחיצים, Enter להפעלה. */
export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = 'הקלידו פקודה או חפשו...',
  emptyMessage = 'לא נמצאו פקודות תואמות',
}: Props) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return commands;
    return commands.filter((c) => {
      const corpus = [c.title, c.description ?? '', c.group ?? '', ...(c.keywords ?? [])].join(' ');
      return fuzzyMatch(q, corpus);
    });
  }, [q, commands]);

  const grouped = useMemo(() => {
    const m = new Map<string, Command[]>();
    for (const c of filtered) {
      const g = c.group ?? 'כללי';
      const list = m.get(g) ?? [];
      list.push(c);
      m.set(g, list);
    }
    return Array.from(m.entries());
  }, [filtered]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) {
        cmd.action();
        onClose();
      }
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-active="true"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="לוח פקודות"
      dir="rtl"
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/50 p-4 pt-[12vh] animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-bg shadow-2xl border border-border">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full bg-transparent py-3 outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-muted sm:inline">
            Esc
          </kbd>
        </div>
        <ul ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-1">
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</li>
          )}
          {grouped.map(([group, list]) => (
            <li key={group}>
              <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted">{group}</div>
              <ul>
                {list.map((c) => {
                  flatIndex++;
                  const Icon = c.icon;
                  const isActive = flatIndex === active;
                  const idx = flatIndex;
                  return (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm',
                        isActive ? 'bg-primary text-primary-fg' : 'hover:bg-surface',
                      )}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => {
                        c.action();
                        onClose();
                      }}
                    >
                      {Icon && <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />}
                      <span className="flex-1 truncate">{c.title}</span>
                      {c.shortcut && (
                        <kbd
                          className={cn(
                            'rounded border px-1.5 py-0.5 text-[10px] font-mono',
                            isActive
                              ? 'border-primary-fg/40 text-primary-fg'
                              : 'border-border text-muted',
                          )}
                        >
                          {formatCombo(c.shortcut)}
                        </kbd>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        <footer className="flex items-center justify-between border-t border-border bg-surface px-3 py-1.5 text-xs text-muted">
          <span>{filtered.length} פקודות</span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" aria-hidden />
            להפעלה
          </span>
        </footer>
      </div>
    </div>
  );
}
