import { useState } from 'react';
import { api } from '../lib/api';

export function Login() {
  const [email, setEmail] = useState('admin@example.co.il');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await api.post(`/auth/${mode}`, mode === 'login' ? { email, password } : { email, password, name });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      location.href = '/';
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'שגיאה');
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <form onSubmit={submit} className="card" style={{ width: 360 }}>
        <h2 style={{ marginTop: 0 }}>{mode === 'login' ? 'כניסה' : 'הרשמה'}</h2>
        <div className="flex-col">
          {mode === 'register' && (
            <div><label className="muted">שם</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div><label className="muted">אימייל</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label className="muted">סיסמה</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {err && <div style={{ color: 'var(--danger)' }}>{err}</div>}
          <button type="submit" className="primary">{mode === 'login' ? 'כניסה' : 'הרשמה'}</button>
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'אין לי חשבון — הרשמה' : 'יש לי חשבון — כניסה'}
          </button>
        </div>
      </form>
    </div>
  );
}
