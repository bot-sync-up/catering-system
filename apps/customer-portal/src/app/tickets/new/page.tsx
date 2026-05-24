'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function NewTicketPage() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'שגיאה');
      router.push(`/tickets/${j.ticket.id}`);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Header />
      <main className="flex-1 p-4">
        <form onSubmit={submit} className="card space-y-3">
          <h2 className="text-lg font-bold">פנייה חדשה</h2>
          <label className="block">
            <span className="text-sm font-medium">נושא</span>
            <input className="input mt-1" required maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">תוכן</span>
            <textarea className="input mt-1" required rows={6} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} />
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-3">
            <button className="btn-primary flex-1" disabled={busy}>{busy ? 'שולח...' : 'שלח פנייה'}</button>
            <button type="button" className="btn-ghost" onClick={() => router.back()}>ביטול</button>
          </div>
        </form>
      </main>
    </>
  );
}
