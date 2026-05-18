import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { he } from '../../locales/he';
import { api } from '../../lib/api';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.forgot(email);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : he.errors.server);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>{he.forgot.title}</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {done && <div className="alert alert-success">{he.forgot.sent}</div>}

        {!done && (
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">{he.forgot.email}</label>
              <input id="email" type="email" required dir="ltr"
                     value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? he.common.loading : he.forgot.submit}
            </button>
          </form>
        )}

        <div className="foot-link">
          <Link href="/auth/login">{he.common.back}</Link>
        </div>
      </div>
    </main>
  );
}
