import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { he } from '../../locales/he';
import { api } from '../../lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError(he.signup.mismatch); return; }
    setBusy(true);
    try {
      await api.signup({ email, password, fullName, phone: phone || undefined });
      // התחברות אוטומטית אחרי הרשמה
      const r = await api.login(email, password);
      if (r.status === '2fa_required') router.push('/auth/2fa');
      else router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : he.errors.server);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>{he.signup.title}</h1>
        <p className="subtitle">{he.common.appName}</p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="name">{he.signup.fullName}</label>
            <input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="email">{he.signup.email}</label>
            <input id="email" type="email" required dir="ltr"
                   value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="phone">{he.signup.phone}</label>
            <input id="phone" type="tel" dir="ltr"
                   value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">{he.signup.password}</label>
            <input id="password" type="password" autoComplete="new-password" required
                   value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="hint">{he.signup.passwordReq}</span>
          </div>
          <div className="field">
            <label htmlFor="confirm">{he.signup.confirmPassword}</label>
            <input id="confirm" type="password" autoComplete="new-password" required
                   value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>

          <button className="btn" type="submit" disabled={busy}>
            {busy ? he.common.loading : he.signup.submit}
          </button>
        </form>

        <div className="foot-link">
          <Link href="/auth/login">{he.signup.loginCta}</Link>
        </div>
      </div>
    </main>
  );
}
