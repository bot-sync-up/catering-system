import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/store';
import { dateHe } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  open: 'פתוחה',
  in_progress: 'בטיפול',
  resolved: 'נסגרה'
};

export default async function TicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const tickets = Array.from(db().tickets.values())
    .filter(t => t.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <Header />
      <main className="flex-1 p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">פניות</h2>
          <Link href="/tickets/new" className="btn-primary !py-2 !px-3 text-sm">פנייה חדשה</Link>
        </div>
        {tickets.length === 0 ? (
          <div className="card text-center text-slate-500">אין פניות פתוחות</div>
        ) : (
          <ul className="space-y-3">
            {tickets.map(t => (
              <li key={t.id} className="card">
                <Link href={`/tickets/${t.id}`} className="block">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{t.subject}</h3>
                    <span className="badge bg-slate-100 text-slate-700">{STATUS_LABEL[t.status]}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{dateHe(t.createdAt)}</p>
                  <p className="text-sm text-slate-700 mt-2 line-clamp-2">{t.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />
    </>
  );
}
