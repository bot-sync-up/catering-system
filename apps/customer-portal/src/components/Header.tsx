import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';

export default async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold text-brand text-lg">פורטל לקוחות</Link>
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">שלום, {user.name}</span>
            <form action="/api/auth/logout" method="post">
              <button className="text-sm text-slate-500 hover:text-brand" formAction="/api/auth/logout">יציאה</button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="text-sm text-brand">התחברות</Link>
        )}
      </div>
    </header>
  );
}
