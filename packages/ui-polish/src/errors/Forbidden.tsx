import { ShieldOff, Home } from 'lucide-react';
import { StatusPage } from './StatusPage';

interface Props {
  homeHref?: string;
  contactHref?: string;
}

/** עמוד 403 — אין הרשאה. */
export function Forbidden({
  homeHref = '/',
  contactHref = 'mailto:admin@syncup.co.il',
}: Props = {}) {
  return (
    <StatusPage
      code={403}
      illustration={
        <div className="rounded-full bg-warning/10 p-5">
          <ShieldOff className="h-16 w-16 text-warning" aria-hidden />
        </div>
      }
      title="אין לכם הרשאה"
      description="אין באפשרותכם לצפות בעמוד זה. אם לדעתכם מדובר בטעות, פנו למנהל המערכת."
      actions={
        <>
          <a
            href={homeHref}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-fg hover:bg-primary-hover transition"
          >
            <Home className="h-4 w-4" aria-hidden />
            לעמוד הראשי
          </a>
          <a
            href={contactHref}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 hover:bg-border transition"
          >
            פנייה למנהל
          </a>
        </>
      }
    />
  );
}
