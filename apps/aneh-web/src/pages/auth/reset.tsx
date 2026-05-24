import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { he } from '../../locales/he';
import { api } from '../../lib/api';

export default function ResetPage() {
  const router = useRouter();
  const token = (router.query.token as string) ?? '';
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw !== confirm) { setError(he.signup.mismatch); return; }
    setBusy(true);
    try {
      await api.reset(token, pw);
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : he.errors.server);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>{he.reset.title}</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {done && <div className="alert alert-success">{he.common.success}</div>}

        {!done && (
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="pw">{he.reset.newPassword}</label>
              <input id="pw" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} />
              <span className="hint">{he.signup.passwordReq}</span>
            </div>
            <div className="field">
              <label htmlFor="confirm">{he.reset.confirm}</label>
              <input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={busy || !token}>
              {busy ? he.common.loading : he.reset.submit}
            </button>
          </form>
        )}
        <div className="foot-link"><Link href="/auth/login">{he.common.back}</Link></div>
      </div>
    </main>
  );
}
