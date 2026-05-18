import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { he } from '../../locales/he';
import { api } from '../../lib/api';

export default function Setup2FaPage() {
  const router = useRouter();
  const [qr, setQr] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tok = sessionStorage.getItem('access_token') ?? '';
    if (!tok) { router.push('/auth/login'); return; }
    api.setup2fa(tok)
      .then((r) => { setQr(r.qrDataUrl); setCodes(r.backupCodes); })
      .catch((e) => setError(e instanceof Error ? e.message : he.errors.server));
  }, [router]);

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>{he.setup2fa.title}</h1>
        {error && <div className="alert alert-error">{error}</div>}
        {qr && (
          <>
            <p className="subtitle">{he.setup2fa.scan}</p>
            <div className="qr-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR" />
            </div>
            <h3>{he.setup2fa.backupTitle}</h3>
            <div className="backup-codes">
              {codes.map((c) => <code key={c}>{c}</code>)}
            </div>
            <button className="btn" onClick={() => router.push('/')}>{he.setup2fa.done}</button>
          </>
        )}
      </div>
    </main>
  );
}
