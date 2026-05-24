import { RefreshCw, LifeBuoy } from 'lucide-react';
import { StatusPage } from './StatusPage';

interface Props {
  onRetry?: () => void;
  supportHref?: string;
}

/** עמוד 500 — שגיאת שרת. */
export function ServerError({ onRetry, supportHref = 'mailto:support@syncup.co.il' }: Props = {}) {
  return (
    <StatusPage
      code={500}
      title="תקלה בשרת"
      description="נתקלנו בבעיה זמנית בעיבוד הבקשה. הצוות שלנו כבר מטפל בכך — אנא נסו שוב בעוד דקה."
      actions={
        <>
          <button
            type="button"
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-fg hover:bg-primary-hover transition"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            נסה שוב
          </button>
          <a
            href={supportHref}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 hover:bg-border transition"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden />
            צרו קשר עם התמיכה
          </a>
        </>
      }
    />
  );
}
