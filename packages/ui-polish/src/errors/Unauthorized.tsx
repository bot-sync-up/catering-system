import { LogIn } from 'lucide-react';
import { StatusPage } from './StatusPage';

interface Props {
  loginHref?: string;
}

/** עמוד 401 — לא מחובר. */
export function Unauthorized({ loginHref = '/login' }: Props = {}) {
  return (
    <StatusPage
      code={401}
      title="נדרשת התחברות"
      description="עליכם להתחבר למערכת כדי להמשיך. לאחר ההתחברות תועברו לעמוד אליו ניסיתם להגיע."
      actions={
        <a
          href={loginHref}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-fg hover:bg-primary-hover transition"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          התחברות
        </a>
      }
    />
  );
}
