import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { getCurrentUser } from '@/lib/session';
import { listOrders } from '@/lib/orders';
import { STATUS_LABEL } from '@/lib/store';
import { dateHe, ils } from '@/lib/format';

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const orders = listOrders(user.id);

  return (
    <>
      <Header />
      <main className="flex-1 p-4 space-y-4">
        <h2 className="text-lg font-bold">היסטוריה ומסמכים</h2>
        {orders.length === 0 ? (
          <div className="card text-center text-slate-500">אין הזמנות עדיין</div>
        ) : (
          <ul className="space-y-3">
            {orders.map(o => (
              <li key={o.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <Link href={`/orders/${o.id}`} className="font-semibold text-brand">#{o.id.slice(-6)}</Link>
                    <div className="text-xs text-slate-500">{dateHe(o.createdAt)}</div>
                  </div>
                  <span className="badge bg-slate-100 text-slate-700">{STATUS_LABEL[o.status]}</span>
                </div>
                <div className="mt-2 text-sm">{o.lines.map(l => `${l.name} × ${l.qty}`).join(', ')}</div>
                <div className="flex justify-between items-center mt-3">
                  <span className="font-bold">{ils(o.total)}</span>
                  {o.documents && o.documents[0] && (
                    <a className="text-sm text-brand" href={o.documents[0].url} target="_blank" rel="noopener">הורד חשבונית</a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />
    </>
  );
}
