import React, { useEffect, useState } from 'react';
import { he } from '../locales/he';

interface LogRow {
  id: number;
  createdAt: string;
  flow: string;
  success: boolean;
  attempt: number;
  durationMs: number;
  errorMessage?: string;
  request?: unknown;
}

const API = '/admin/cardcom';

export function LogsPage(): JSX.Element {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [filterFlow, setFilterFlow] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'true' | 'false'>('');

  async function load() {
    const qs = new URLSearchParams();
    if (filterFlow) qs.set('flow', filterFlow);
    if (filterStatus) qs.set('success', filterStatus);
    const res = await fetch(`${API}/logs?${qs.toString()}`);
    const data = await res.json();
    setRows(data);
  }
  useEffect(() => {
    void load();
  }, [filterFlow, filterStatus]);

  async function retry(row: LogRow) {
    await fetch(`${API}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flow: row.flow, payload: row.request ?? {} }),
    });
    alert(he.retry.sent);
  }

  return (
    <div>
      <div className="filters">
        <label>{he.logs.filter}:</label>
        <input
          placeholder={he.logs.flow}
          value={filterFlow}
          onChange={(e) => setFilterFlow(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as '' | 'true' | 'false')}>
          <option value="">{he.logs.all}</option>
          <option value="true">{he.logs.success}</option>
          <option value="false">{he.logs.failed}</option>
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th>{he.logs.createdAt}</th>
            <th>{he.logs.flow}</th>
            <th>{he.logs.status}</th>
            <th>{he.logs.attempt}</th>
            <th>{he.logs.duration}</th>
            <th>{he.logs.error}</th>
            <th>{he.logs.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleString('he-IL')}</td>
              <td>{r.flow}</td>
              <td>
                <span className={`badge ${r.success ? 'ok' : 'fail'}`}>
                  {r.success ? he.logs.success : he.logs.failed}
                </span>
              </td>
              <td>{r.attempt}</td>
              <td>{r.durationMs}</td>
              <td>{r.errorMessage ?? ''}</td>
              <td>
                {!r.success && <button onClick={() => retry(r)}>{he.logs.retry}</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
