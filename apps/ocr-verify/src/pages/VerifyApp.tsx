import React, { useState } from 'react';
import { InvoiceForm } from '../components/InvoiceForm';
import { AlertList } from '../components/AlertList';
import { Dropzone } from '../components/Dropzone';
import type { Invoice, PendingInvoice } from '../types';

const blankInvoice = (): Invoice => ({
  supplier: { name: '', taxId: '' },
  date: new Date().toISOString().slice(0, 10),
  invoiceNum: '',
  currency: 'ILS',
  items: [{ desc: '', qty: 1, price: 0, vat: 0.17 }],
  total: 0,
});

/**
 * Verification cockpit. Shows pending invoices (Vision-extracted) on
 * the right, the original document preview on the left (TODO: render),
 * lets the user fix fields, then POSTs back as approved.
 */
export const VerifyApp: React.FC = () => {
  const [pending, setPending] = useState<PendingInvoice[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [draft, setDraft] = useState<Invoice>(blankInvoice());
  const [status, setStatus] = useState<string>('');

  const uploadBatch = async (files: File[]) => {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    fd.append('uploaderId', 'web-user');
    const res = await fetch('/api/ingest/batch', { method: 'POST', body: fd });
    const data = await res.json();
    setStatus(`נשלחו ${files.length} קבצים לעיבוד (batchId=${data.batchId})`);
  };

  const approve = async () => {
    if (active == null) return;
    const hash = pending[active].hash;
    const res = await fetch(`/api/verify/${hash}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice: draft }),
    });
    if (res.ok) {
      setStatus('אושר. הפריטים נשמרו ללמידה.');
      setPending(pending.filter((_, i) => i !== active));
      setActive(null);
      setDraft(blankInvoice());
    } else {
      const data = await res.json();
      setStatus(`שגיאה: ${JSON.stringify(data.issues ?? data.error)}`);
    }
  };

  const select = (i: number) => {
    setActive(i);
    setDraft(pending[i].invoice);
  };

  return (
    <div dir="rtl" style={{ maxWidth: 1280, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>אימות חשבוניות</h1>

      <Dropzone onUpload={uploadBatch} />
      {status && <p style={{ color: '#1f78d1' }}>{status}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, marginTop: 24 }}>
        <aside style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0 }}>בהמתנה לאימות ({pending.length})</h3>
          {pending.length === 0 && <p style={{ color: '#888' }}>אין חשבוניות בהמתנה</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pending.map((p, i) => (
              <li key={p.hash} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => select(i)}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    padding: 10,
                    border: i === active ? '2px solid #1f78d1' : '1px solid #ddd',
                    background: i === active ? '#eaf4ff' : '#fff',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {p.invoice.supplier.name || '(ללא שם)'}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {p.invoice.invoiceNum} · {p.invoice.total} ₪ · {p.source}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main>
          {active != null ? (
            <>
              <AlertList alerts={pending[active].alerts} />
              <InvoiceForm value={draft} onChange={setDraft} />
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button onClick={approve} style={btnPrimary}>
                  אשר ושלח ל-iCount
                </button>
                <button
                  onClick={() => {
                    setPending(pending.filter((_, i) => i !== active));
                    setActive(null);
                  }}
                  style={btnGhost}
                >
                  דחה
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: '#888' }}>בחר חשבונית מהרשימה כדי לאמת</p>
          )}
        </main>
      </div>
    </div>
  );
};

const btnPrimary: React.CSSProperties = {
  background: '#1f78d1',
  color: 'white',
  border: 0,
  padding: '10px 20px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
};
const btnGhost: React.CSSProperties = {
  background: 'transparent',
  color: '#666',
  border: '1px solid #ccc',
  padding: '10px 20px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
};
