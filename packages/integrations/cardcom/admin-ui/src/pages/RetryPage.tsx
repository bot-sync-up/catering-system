import React, { useState } from 'react';
import { he } from '../locales/he';

const FLOWS = ['charge', 'refund', 'tokenize', 'recurring.create', 'recurring.cancel'] as const;

export function RetryPage(): JSX.Element {
  const [flow, setFlow] = useState<(typeof FLOWS)[number]>('charge');
  const [payload, setPayload] = useState('{\n  "amount": 100,\n  "numOfPayments": 1\n}');
  const [overrides, setOverrides] = useState('{}');
  const [msg, setMsg] = useState('');

  async function submit() {
    try {
      const body = {
        original: { flow, payload: JSON.parse(payload) },
        overrides: JSON.parse(overrides),
      };
      const res = await fetch('/admin/cardcom/retry-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMsg(`${he.retry.sent} (jobId: ${data.jobId})`);
    } catch (e) {
      setMsg('שגיאה: ' + (e as Error).message);
    }
  }

  return (
    <div>
      <div className="filters">
        <label>{he.retry.flow}:</label>
        <select value={flow} onChange={(e) => setFlow(e.target.value as typeof flow)}>
          {FLOWS.map((f) => (
            <option key={f} value={f}>
              {(he.flows as Record<string, string>)[f] ?? f}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <label>{he.retry.payload}</label>
          <textarea
            style={{ width: '100%', minHeight: 200, fontFamily: 'monospace', direction: 'ltr' }}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>{he.retry.overrides}</label>
          <textarea
            style={{ width: '100%', minHeight: 200, fontFamily: 'monospace', direction: 'ltr' }}
            value={overrides}
            onChange={(e) => setOverrides(e.target.value)}
          />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={submit}>{he.retry.submit}</button>
        {msg && <span style={{ marginRight: 16 }}>{msg}</span>}
      </div>
    </div>
  );
}
