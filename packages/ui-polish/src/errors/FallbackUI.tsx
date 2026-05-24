import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  error: Error;
  onReset?: () => void;
  showDetails?: boolean;
  className?: string;
}

/** ממשק נפילה כללי המוצג כשמתרחשת שגיאה לא צפויה. */
export function FallbackUI({ error, onReset, showDetails = false, className }: Props) {
  return (
    <div
      role="alert"
      dir="rtl"
      className={cn(
        'min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center bg-bg text-text',
        className,
      )}
    >
      <div className="rounded-full bg-danger/10 p-4">
        <AlertTriangle className="h-12 w-12 text-danger" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold">משהו השתבש</h1>
      <p className="max-w-md text-muted">
        אירעה שגיאה לא צפויה. ניתן לנסות לטעון מחדש את הדף, ואם הבעיה חוזרת אנא פנו לתמיכה.
      </p>
      {showDetails && (
        <details className="max-w-2xl rounded border border-border bg-surface p-3 text-start text-sm">
          <summary className="cursor-pointer font-medium">פרטי השגיאה (למפתחים)</summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{error.message}</pre>
          {error.stack && (
            <pre className="mt-1 overflow-auto whitespace-pre-wrap text-xs text-muted">
              {error.stack}
            </pre>
          )}
        </details>
      )}
      <div className="flex gap-3">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-fg hover:bg-primary-hover transition"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            נסה שוב
          </button>
        )}
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 hover:bg-border transition"
        >
          <Home className="h-4 w-4" aria-hidden />
          חזרה לדף הבית
        </a>
      </div>
    </div>
  );
}
