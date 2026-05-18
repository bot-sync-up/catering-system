'use client';

import { use, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { dateHe } from '@/lib/format';

type Reply = { from: 'user' | 'support'; body: string; at: number };
type Ticket = { id: string; subject: string; body: string; status: string; createdAt: number; replies: Reply[] };

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [t, setT] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/tickets/${id}`);
    const j = await r.json();
    if (r.ok) setT(j.ticket);
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 3500);
    return () => clearInterval(i);
  }, [id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    await fetch(`/api/tickets/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: reply })
    });
    setReply('');
    await load();
    setBusy(false);
  }

  if (!t) return <main className="flex-1 p-6 text-center text-slate-500">טוען...</main>;

  return (
    <>
      <Header />
      <main className="flex-1 p-4 space-y-4">
        <section className="card">
          <h2 className="font-bold">{t.subject}</h2>
          <p className="text-xs text-slate-500 mt-1">{dateHe(t.createdAt)}</p>
          <p className="text-sm mt-3 whitespace-pre-wrap">{t.body}</p>
        </section>
        <section className="space-y-2">
          {t.replies.map((r, i) => (
            <div key={i} className={['card', r.from === 'support' ? 'bg-brand-light/40' : ''].join(' ')}>
              <div className="text-xs text-slate-500 mb-1">{r.from === 'support' ? 'תמיכה' : 'אתה'} · {dateHe(r.at)}</div>
              <p className="text-sm whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
        </section>
        <form onSubmit={send} className="card space-y-3">
          <label className="block">
            <span className="text-sm font-medium">הוסף תגובה</span>
            <textarea className="input mt-1" rows={3} value={reply} onChange={e => setReply(e.target.value)} />
          </label>
          <button className="btn-primary w-full" disabled={busy || !reply.trim()}>{busy ? 'שולח...' : 'שלח תגובה'}</button>
        </form>
      </main>
    </>
  );
}
