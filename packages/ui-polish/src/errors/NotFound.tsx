import { Home, Search } from 'lucide-react';
import { StatusPage } from './StatusPage';

interface Props {
  homeHref?: string;
  searchHref?: string;
}

/** עמוד 404 — לא נמצא. */
export function NotFound({ homeHref = '/', searchHref = '/search' }: Props = {}) {
  return (
    <StatusPage
      code={404}
      title="הדף לא נמצא"
      description="הקישור שניסיתם להגיע אליו לא קיים, הוסר או שונה. בדקו את הכתובת ונסו שוב."
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
            href={searchHref}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 hover:bg-border transition"
          >
            <Search className="h-4 w-4" aria-hidden />
            חיפוש באתר
          </a>
        </>
      }
    />
  );
}
