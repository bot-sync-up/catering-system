import { useEffect, useState } from 'react';

interface Schedule {
  id: string;
  type: string;
  cron: string;
  recipients: string[];
  format: string;
  enabled: boolean;
  lastRunAt: string | null;
}

const TYPES = ['PNL', 'CASHFLOW', 'VAT', 'FORM_106', 'INVENTORY_REVAL', 'COGS_EVENT', 'BY_AGENT', 'BY_CUSTOMER', 'BY_CATEGORY', 'RETENTION', 'COHORT', 'FORECAST'];

export default function Schedules() {
  const [items, setItems] = useState<Schedule[]>([]);
  const [draft, setDraft] = useState({
    type: 'PNL', cron: '0 9 1 * *', recipients: '', format: 'XLSX',
    from: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    to: new Date().toISOString(),
    officialOnly: false,
  });

  async function load() {
    setItems(await fetch('/api/schedules').then(r => r.json()));
  }
  useEffect(() => { load(); }, []);

  async function save() {
    await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: draft.type,
        cron: draft.cron,
        format: draft.format,
        recipients: draft.recipients.split(',').map(s => s.trim()).filter(Boolean),
        params: { from: draft.from, to: draft.to, officialOnly: draft.officialOnly },
      }),
    });
    await load();
  }

  async function del(id: string) {
    await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="dashboard">
      <h1>תזמון דוחות אוטומטיים</h1>
      <div className="chart-card">
        <h3>הוסף תזמון</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>סוג דוח
            <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>Cron
            <input value={draft.cron} onChange={e => setDraft({ ...draft, cron: e.target.value })} />
          </label>
          <label>פורמט
            <select value={draft.format} onChange={e => setDraft({ ...draft, format: e.target.value })}>
              <option>XLSX</option><option>PDF</option><option>JSON</option>
            </select>
          </label>
          <label>נמענים (מופרדים בפסיק)
            <input value={draft.recipients} onChange={e => setDraft({ ...draft, recipients: e.target.value })} />
          </label>
          <label>רק רשמי
            <input type="checkbox" checked={draft.officialOnly} onChange={e => setDraft({ ...draft, officialOnly: e.target.checked })} />
          </label>
        </div>
        <button className="btn" onClick={save} style={{ marginTop: 12 }}>שמור תזמון</button>
      </div>

      <div className="chart-card">
        <h3>תזמונים פעילים</h3>
        <table className="flags">
          <thead>
            <tr><th>סוג</th><th>Cron</th><th>פורמט</th><th>נמענים</th><th>הופעל לאחרונה</th><th></th></tr>
          </thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id}>
                <td>{s.type}</td>
                <td><code>{s.cron}</code></td>
                <td>{s.format}</td>
                <td>{s.recipients.join(', ')}</td>
                <td>{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString('he-IL') : '—'}</td>
                <td><button className="btn secondary" onClick={() => del(s.id)}>מחק</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
