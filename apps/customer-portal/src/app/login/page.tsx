'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@example.com');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const r = await fetch('/api/auth/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'שגיאה בבקשה');
      setDemoCode(j.demoCode || null);
      setStage('code');
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const r = await fetch('/api/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'אימות נכשל');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="card w-full">
        <h1 className="text-2xl font-bold text-center mb-2 text-brand">ברוך הבא</h1>
        <p className="text-sm text-slate-600 text-center mb-6">היכנס כדי להזמין ולנהל את החשבון שלך</p>

        {stage === 'email' && (
          <form onSubmit={requestOtp} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium">אימייל</span>
              <input className="input mt-1" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
            </label>
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'שולח...' : 'שלח לי קוד'}</button>
          </form>
        )}

        {stage === 'code' && (
          <form onSubmit={verifyOtp} className="space-y-3">
            <p className="text-sm text-slate-600">שלחנו קוד בן 6 ספרות לכתובת {email}</p>
            {demoCode && (
              <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2">
                קוד דמו: <strong>{demoCode}</strong>
              </div>
            )}
            <label className="block">
              <span className="text-sm font-medium">קוד אימות</span>
              <input className="input mt-1 tracking-widest text-center text-xl" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value)} />
            </label>
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'מאמת...' : 'התחבר'}</button>
            <button type="button" className="btn-ghost w-full" onClick={() => setStage('email')}>חזור</button>
          </form>
        )}

        {error && <p className="text-sm text-red-600 mt-3 text-center">{error}</p>}
      </div>
    </main>
  );
}
