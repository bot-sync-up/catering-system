'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import StatusBar from '@/components/StatusBar';
import StarRating from '@/components/StarRating';
import { dateHe, ils } from '@/lib/format';
import type { Order } from '@/lib/store';
import { STATUS_LABEL } from '@/lib/store';

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    fetch(`/api/orders/${id}`).then(r => r.json()).then(j => {
      if (j.error) { setErr(j.error); return; }
      setOrder(j.order);
      es = new EventSource(`/api/orders/${id}/stream`);
      es.onmessage = e => {
        try {
          const data = JSON.parse(e.data);
          if (data.order) setOrder(data.order);
        } catch { /* ignore */ }
      };
      es.onerror = () => { /* keep trying */ };
    });
    return () => { es?.close(); };
  }, [id]);

  async function submitFeedback() {
    if (!stars) return;
    const r = await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars, text, orderId: id })
    });
    if (r.ok) setSubmitted(true);
  }

  if (err) return <main className="flex-1 p-6"><div className="card text-center text-red-600">{err}</div></main>;
  if (!order) return <main className="flex-1 p-6 text-center text-slate-500">טוען...</main>;

  return (
    <>
      <Header />
      <main className="flex-1 p-4 space-y-4">
        <section className="card">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-bold">הזמנה #{order.id.slice(-6)}</h2>
              <p className="text-xs text-slate-500">{dateHe(order.createdAt)}</p>
            </div>
            <span className="badge bg-brand-light text-brand-dark">{STATUS_LABEL[order.status]}</span>
          </div>
          <div className="mt-4">
            <StatusBar status={order.status} />
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">עדכון אחרון: {dateHe(order.updatedAt)}</p>
        </section>

        <section className="card">
          <h3 className="font-semibold mb-3">פירוט</h3>
          <ul className="divide-y divide-slate-100">
            {order.lines.map(l => (
              <li key={l.itemId} className="flex justify-between py-2 text-sm">
                <span>{l.name} × {l.qty}</span>
                <span>{ils(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between mt-3 pt-3 border-t border-slate-200 font-bold">
            <span>סה"כ</span>
            <span>{ils(order.total)}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            סטטוס תשלום: {order.paid ? <span className="text-green-700">שולם · {order.paymentRef}</span> : 'ממתין'}
          </div>
        </section>

        {order.documents && order.documents.length > 0 && (
          <section className="card">
            <h3 className="font-semibold mb-3">מסמכים</h3>
            <ul className="space-y-2">
              {order.documents.map(d => (
                <li key={d.url}>
                  <a href={d.url} target="_blank" rel="noopener" className="flex items-center gap-2 text-brand">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
                    </svg>
                    {d.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.status === 'delivered' && !submitted && (
          <section className="card">
            <h3 className="font-semibold mb-2">איך הייתה ההזמנה?</h3>
            <StarRating value={stars} onChange={setStars} />
            <textarea
              className="input mt-3"
              rows={3}
              placeholder="ספר לנו על החוויה..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <button className="btn-primary w-full mt-3" disabled={!stars} onClick={submitFeedback}>שלח משוב</button>
          </section>
        )}
        {submitted && (
          <section className="card text-center text-green-700">תודה על המשוב!</section>
        )}

        <Link href="/dashboard" className="btn-ghost w-full">חזרה לדשבורד</Link>
      </main>
      <BottomNav />
    </>
  );
}
