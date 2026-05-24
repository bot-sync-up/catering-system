import { useState } from 'react';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications } from '../stores/notifications';
import { NoNotifications } from '../empty/presets';
import { cn } from '../utils/cn';

interface Props {
  className?: string;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'לפני רגע';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}

const kindBg = {
  info: 'bg-info/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  error: 'bg-danger/10',
};

/** מרכז התראות — פעמון עם פאנל נפתח. */
export function NotificationCenter({ className }: Props) {
  const [open, setOpen] = useState(false);
  const items = useNotifications((s) => s.items);
  const unread = useNotifications((s) => s.unreadCount());
  const markAllRead = useNotifications((s) => s.markAllRead);
  const clear = useNotifications((s) => s.clear);
  const markRead = useNotifications((s) => s.markRead);
  const remove = useNotifications((s) => s.remove);

  return (
    <div className={cn('relative', className)} dir="rtl">
      <button
        type="button"
        aria-label={`התראות${unread ? ` (${unread} לא נקראו)` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-surface"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -left-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="מרכז התראות"
          className="absolute left-0 mt-2 w-96 max-h-[70vh] overflow-hidden rounded-lg border border-border bg-bg shadow-lg flex flex-col z-50"
        >
          <header className="flex items-center justify-between border-b border-border p-3">
            <h2 className="font-semibold">התראות</h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={markAllRead}
                disabled={unread === 0}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-surface disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                סמן הכל כנקרא
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={items.length === 0}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-surface disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                נקה
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <NoNotifications />
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'group flex items-start gap-3 p-3 transition hover:bg-surface',
                      !n.read && 'bg-primary/5',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1 h-2 w-2 flex-shrink-0 rounded-full',
                        n.read ? 'bg-transparent' : 'bg-primary',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="flex-1 text-start"
                    >
                      <div className={cn('inline-block rounded px-1.5 py-0.5 text-xs', kindBg[n.kind])}>
                        {n.title}
                      </div>
                      {n.message && (
                        <p className="mt-1 text-sm text-text line-clamp-2">{n.message}</p>
                      )}
                      <p className="mt-1 text-xs text-muted">{timeAgo(n.createdAt)}</p>
                    </button>
                    <button
                      type="button"
                      aria-label="הסר התראה"
                      onClick={() => remove(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
