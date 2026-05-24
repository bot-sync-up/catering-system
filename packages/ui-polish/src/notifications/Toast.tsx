import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotifications, type Notification, type NotificationKind } from '../stores/notifications';
import { cn } from '../utils/cn';

const kindStyles: Record<NotificationKind, { ring: string; icon: typeof Info; iconClass: string }> =
  {
    info: { ring: 'border-info', icon: Info, iconClass: 'text-info' },
    success: { ring: 'border-success', icon: CheckCircle2, iconClass: 'text-success' },
    warning: { ring: 'border-warning', icon: AlertTriangle, iconClass: 'text-warning' },
    error: { ring: 'border-danger', icon: AlertCircle, iconClass: 'text-danger' },
  };

const kindLabel: Record<NotificationKind, string> = {
  info: 'מידע',
  success: 'הצלחה',
  warning: 'אזהרה',
  error: 'שגיאה',
};

interface ToastProps {
  notification: Notification;
}

function Toast({ notification }: ToastProps) {
  const remove = useNotifications((s) => s.remove);
  const { kind, title, message, duration, action, id } = notification;
  const style = kindStyles[kind];
  const Icon = style.icon;

  useEffect(() => {
    if (!duration) return;
    const t = window.setTimeout(() => remove(id), duration);
    return () => window.clearTimeout(t);
  }, [id, duration, remove]);

  return (
    <div
      role="status"
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-lg border-r-4 bg-surface p-3 shadow-md animate-slide-in-left',
        style.ring,
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', style.iconClass)} aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="sr-only">{kindLabel[kind]}:</span>
          <p className="font-medium text-text truncate">{title}</p>
        </div>
        {message && <p className="mt-0.5 text-sm text-muted">{message}</p>}
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              remove(id);
            }}
            className="mt-1.5 text-sm font-medium text-primary hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="סגירה"
        onClick={() => remove(id)}
        className="text-muted hover:text-text"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

interface ToasterProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const positionMap = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

/** מיכל ה-Toasts — להציב פעם אחת באפליקציה. */
export function Toaster({ position = 'top-left' }: ToasterProps = {}) {
  const items = useNotifications((s) => s.items);
  const visible = items.filter((n) => typeof n.duration === 'number').slice(0, 5);
  return (
    <div
      dir="rtl"
      aria-label="התראות מערכת"
      className={cn(
        'pointer-events-none fixed z-[100] flex flex-col gap-2',
        positionMap[position],
      )}
    >
      {visible.map((n) => (
        <Toast key={n.id} notification={n} />
      ))}
    </div>
  );
}
