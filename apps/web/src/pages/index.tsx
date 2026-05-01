import Link from 'next/link';
import { he } from '../locales/he';

export default function HomePage() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>{he.common.appName}</h1>
        <p className="subtitle">פלטפורמת שאלות ותשובות לרבנים — מודול אימות</p>
        <Link href="/auth/login" className="btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '46px' }}>
          {he.login.submit}
        </Link>
        <div className="foot-link">
          <Link href="/auth/signup">{he.signup.title}</Link>
        </div>
      </div>
    </main>
  );
}
