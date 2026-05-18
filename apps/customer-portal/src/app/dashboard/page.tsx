import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { getCurrentUser } from '@/lib/session';
import { listOrders } from '@/lib/orders';
import { STATUS_LABEL } from '@/lib/store';
import { dateHe, ils } from '@/lib/format';

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const orders = listOrders(user.id);
  const active = orders.find(o => o.status !== 'delivered');
  const recent = orders.slice(0, 3);

  return (
    <>
      <Header />
      <main className="flex-1 p-4 space-y-4">
        <section className="card bg-gradient-to-l from-brand to-brand-dark text-white">
          <h2 className="text-xl font-bold">שלום {user.name}</h2>
          <p className="text-sm opacity-90 mt-1">מה תרצה להזמין היום?</p>
          <Link href="/menu" className="btn bg-white text-brand mt-4 w-full">פתח תפריט</Link>
        </section>

        {active && (
          <section className="card">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">הזמנה פעילה</h3>
              <Link href={`/orders/${active.id}`} className="text-sm text-brand">פרטים</Link>
            </div>
            <p className="text-sm text-slate-600">#{active.id.slice(-6)} · {ils(active.total)}</p>
            <span className="badge bg-brand-light text-brand-dark mt-2">{STATUS_LABEL[active.status]}</span>
          </section>
        )}

        <section className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">פעולות מהירות</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/menu" className="btn-secondary">הזמנה חדשה</Link>
            <Link href="/history" className="btn-secondary">היסטוריה</Link>
            <Link href="/tickets/new" className="btn-secondary">פנייה חדשה</Link>
            <Link href="/feedback" className="btn-secondary">משוב</Link>
          </div>
        </section>

        <section className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">הזמנות אחרונות</h3>
            <Link href="/history" className="text-sm text-brand">הצג הכל</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">אין הזמנות עדיין</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map(o => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex justify-between items-center py-2">
                    <div>
                      <div className="text-sm font-medium">#{o.id.slice(-6)}</div>
                      <div className="text-xs text-slate-500">{dateHe(o.createdAt)}</div>
                    </div>
                    <div className="text-sm">{ils(o.total)}</div>
                    <span className="badge bg-slate-100 text-slate-700">{STATUS_LABEL[o.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  );
}
