import React, { useEffect, useState } from 'react';
import { he } from '../locales/he';

interface CB {
  id: number;
  transactionId: string;
  amount: number;
  reason?: string;
  status: 'opened' | 'resolved';
  receivedAt: string;
}

export function ChargebacksPage(): JSX.Element {
  const [rows, setRows] = useState<CB[]>([]);
  useEffect(() => {
    void fetch('/admin/cardcom/chargebacks')
      .then((r) => r.json())
      .then(setRows);
  }, []);
  return (
    <table>
      <thead>
        <tr>
          <th>{he.chargebacks.transactionId}</th>
          <th>{he.chargebacks.amount}</th>
          <th>{he.chargebacks.reason}</th>
          <th>{he.chargebacks.receivedAt}</th>
          <th>{he.logs.status}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.transactionId}</td>
            <td>{r.amount.toLocaleString('he-IL')} ₪</td>
            <td>{r.reason ?? ''}</td>
            <td>{new Date(r.receivedAt).toLocaleString('he-IL')}</td>
            <td>
              <span className={`badge ${r.status === 'opened' ? 'open' : 'ok'}`}>
                {r.status === 'opened' ? he.chargebacks.open : he.chargebacks.resolved}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
