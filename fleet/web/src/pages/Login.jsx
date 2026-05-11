import { useState } from 'react';
import { api } from '../api/client.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@fleet.local');
  const [password, setPassword] = useState('admin1234');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (e) {
      setErr(e.response?.data?.error || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>צי רכבים — כניסה</h1>
        <div style={{ marginBottom: 12 }}>
          <label>אימייל</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>סיסמה</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{err}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'מתחבר...' : 'התחברות'}
        </button>
      </form>
    </div>
  );
}
