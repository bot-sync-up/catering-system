import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('admin@example.co.il');
  const [password, setPassword] = useState('admin1234');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await auth.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav('/');
    } catch (e) {
      setErr(e.response?.data?.message || 'שגיאת התחברות');
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>התחברות</h1>
        {err && <div className="alert error">{err}</div>}
        <div style={{ marginBottom: '0.75rem' }}>
          <label>אימייל</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label>סיסמה</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn" type="submit" style={{ width: '100%' }}>היכנס</button>
        <div style={{ fontSize: '0.78rem', marginTop: '1rem', color: '#718096' }}>
          ברירת מחדל: admin@example.co.il / admin1234
        </div>
      </form>
    </div>
  );
}
