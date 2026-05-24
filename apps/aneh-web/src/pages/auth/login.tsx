import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { he } from '../../locales/he';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api.login(email, password);
      if (r.status === '2fa_required') {
        // נשמור באופן זמני ב-sessionStorage לצרכי המסך הבא
        sessionStorage.setItem('2fa_sid', r.sessionId!);
        sessionStorage.setItem('2fa_token', r.accessToken!);
        sessionStorage.setItem('2fa_methods', JSON.stringify(r.methods ?? ['totp']));
        router.push('/auth/2fa');
      } else {
        router.push('/');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : he.errors.server);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>{he.login.title}</h1>
        <p className="subtitle">{he.common.appName}</p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">{he.login.email}</label>
            <input
              id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr"
            />
          </div>

          <div className="field">
            <label htmlFor="password">{he.login.password}</label>
            <input
              id="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn" type="submit" disabled={busy}>
            {busy ? he.common.loading : he.login.submit}
          </button>
        </form>

        <div className="foot-link">
          <Link href="/auth/forgot">{he.login.forgotPassword}</Link>
        </div>

        <div className="divider"><span>{he.login.or}</span></div>

        <a href="/api/auth/oauth/google" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginBottom: 8 }}>
          {he.login.google}
        </a>
        <a href="/api/auth/oauth/facebook" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          {he.login.facebook}
        </a>

        <div className="foot-link">
          <Link href="/auth/signup">{he.login.signupCta}</Link>
        </div>
      </div>
    </main>
  );
}
