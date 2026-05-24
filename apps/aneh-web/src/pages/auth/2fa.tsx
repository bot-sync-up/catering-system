import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { he } from '../../locales/he';
import { api } from '../../lib/api';

type Method = 'totp' | 'sms' | 'backup';

export default function TwoFaPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('totp');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<Method[]>(['totp']);
  const [sid, setSid] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    setSid(sessionStorage.getItem('2fa_sid') ?? '');
    setToken(sessionStorage.getItem('2fa_token') ?? '');
    try {
      const a = JSON.parse(sessionStorage.getItem('2fa_methods') ?? '["totp"]') as Method[];
      setAvailable(a.length ? a : ['totp']);
      setMethod(a[0] ?? 'totp');
    } catch {/* ignore */}
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.verify2fa(sid, method, code, token);
      sessionStorage.removeItem('2fa_sid');
      sessionStorage.removeItem('2fa_token');
      sessionStorage.removeItem('2fa_methods');
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : he.twofa.invalid);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>{he.twofa.title}</h1>
        <p className="subtitle">{he.twofa.description}</p>

        {error && <div className="alert alert-error">{error}</div>}

        {available.length > 1 && (
          <div className="method-tabs" role="tablist">
            {(['totp','sms','backup'] as Method[]).filter(m => available.includes(m) || m === 'backup').map(m => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={method === m}
                className={`method-tab ${method === m ? 'active' : ''}`}
                onClick={() => setMethod(m)}
              >
                {he.twofa.method[m]}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="code">{he.twofa.code}</label>
            <input
              id="code" type="text" inputMode="numeric"
              autoComplete="one-time-code" required
              className="code-input" maxLength={method === 'backup' ? 16 : 8}
              value={code} onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={busy || !code}>
            {busy ? he.common.loading : he.twofa.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
