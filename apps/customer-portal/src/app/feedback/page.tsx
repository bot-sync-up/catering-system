'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import StarRating from '@/components/StarRating';
import { dateHe } from '@/lib/format';

type Item = { id: string; stars: number; text: string; createdAt: number; orderId?: string };

export default function FeedbackPage() {
  const [list, setList] = useState<Item[]>([]);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function load() {
    const r = await fetch('/api/feedback');
    const j = await r.json();
    if (r.ok) setList(j.feedback || []);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stars) return;
    setBusy(true);
    const r = await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars, text })
    });
    setBusy(false);
    if (r.ok) {
      setDone(true);
      setStars(0); setText('');
      await load();
      setTimeout(() => setDone(false), 2500);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 p-4 space-y-4">
        <form onSubmit={submit} className="card space-y-3">
          <h2 className="text-lg font-bold">השאר משוב</h2>
          <StarRating value={stars} onChange={setStars} />
          <textarea className="input" rows={4} placeholder="ספר לנו מה דעתך..." value={text} onChange={e => setText(e.target.value)} />
          <button className="btn-primary w-full" disabled={busy || !stars}>{busy ? 'שולח...' : 'שלח משוב'}</button>
          {done && <p className="text-center text-green-700 text-sm">תודה!</p>}
        </form>

        <section>
          <h3 className="font-semibold mb-2">משובים קודמים</h3>
          {list.length === 0 ? (
            <div className="card text-center text-slate-500">אין משובים עדיין</div>
          ) : (
            <ul className="space-y-2">
              {list.map(f => (
                <li key={f.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <StarRating value={f.stars} readOnly size={20} />
                    <span className="text-xs text-slate-500">{dateHe(f.createdAt)}</span>
                  </div>
                  {f.text && <p className="text-sm whitespace-pre-wrap">{f.text}</p>}
                  {f.orderId && <p className="text-xs text-slate-400 mt-1">להזמנה #{f.orderId.slice(-6)}</p>}
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
