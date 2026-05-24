import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

interface Props {
  code: number | string;
  title: string;
  description: string;
  illustration?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** רכיב בסיס לעמודי שגיאת HTTP (404/401/403/500). */
export function StatusPage({ code, title, description, illustration, actions, className }: Props) {
  return (
    <main
      dir="rtl"
      className={cn(
        'min-h-[70vh] flex flex-col items-center justify-center gap-6 p-8 text-center bg-bg text-text',
        className,
      )}
    >
      {illustration ?? (
        <div
          aria-hidden
          className="text-[7rem] font-black leading-none text-primary/20 select-none"
        >
          {code}
        </div>
      )}
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="max-w-md text-muted">{description}</p>
      {actions && <div className="flex flex-wrap justify-center gap-3">{actions}</div>}
    </main>
  );
}
