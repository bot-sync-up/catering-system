'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ils } from '@/lib/format';

function CheckoutInner() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get('orderId') || '';
  const amount = Number(params.get('amount') || 0);
  const [card, setCard] = useState('4580 0000 0000 0000');
  const [exp, setExp] = useState('12/30');
  const [cvv, setCvv] = useState('123');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      // Stub: in real Cardcom integration the iframe POSTs the result here.
      const r = await fetch(`/api/orders/${encodeURIComponent(orderId)}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentRef: `CC-DEMO-${Date.now()}` })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'התשלום נכשל');
      router.push(`/orders/${encodeURIComponent(orderId)}?paid=1`);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Header />
      <main className="flex-1 p-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center">
              <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold">תשלום מאובטח</h2>
              <p className="text-xs text-slate-500">סליקה דרך Cardcom (דמו)</p>
            </div>
          </div>
          <div className="text-sm text-slate-700 mb-3">סכום לתשלום: <strong>{ils(amount)}</strong></div>

          <form onSubmit={pay} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium">שם בעל הכרטיס</span>
              <input className="input mt-1" required value={name} onChange={e => setName(e.target.value)} placeholder="ישראל ישראלי" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">מספר כרטיס</span>
              <input className="input mt-1 tracking-widest" required value={card} onChange={e => setCard(e.target.value)} dir="ltr" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">תוקף</span>
                <input className="input mt-1" required value={exp} onChange={e => setExp(e.target.value)} dir="ltr" placeholder="MM/YY" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">CVV</span>
                <input className="input mt-1" required value={cvv} onChange={e => setCvv(e.target.value)} dir="ltr" inputMode="numeric" maxLength={4} />
              </label>
            </div>
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'מבצע תשלום...' : `שלם ${ils(amount)}`}</button>
            {err && <p className="text-sm text-red-600 text-center">{err}</p>}
            <p className="text-[11px] text-slate-400 text-center">סטאב לדוגמה — לא מחויב כסף אמיתי</p>
          </form>
        </div>
      </main>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">טוען...</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
