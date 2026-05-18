import { useEffect, useState } from 'react';

interface Flag {
  id: string;
  key: string;
  enabled: boolean;
  rolloutPercent: number;
  targetRoles: string[];
  description?: string | null;
}

const ALL_ROLES = ['ADMIN', 'MANAGER', 'AGENT', 'ACCOUNTANT', 'VIEWER'];

export default function FlagsAdmin() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [draft, setDraft] = useState({
    key: '', enabled: true, rolloutPercent: 100, targetRoles: [] as string[], description: '',
  });

  async function load() {
    const f = await fetch('/api/flags').then(r => r.json());
    setFlags(f);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    await fetch('/api/flags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    setDraft({ key: '', enabled: true, rolloutPercent: 100, targetRoles: [], description: '' });
    await load();
  }

  async function del(key: string) {
    await fetch(`/api/flags?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    await load();
  }

  async function toggle(f: Flag) {
    await fetch('/api/flags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, enabled: !f.enabled }),
    });
    await load();
  }

  return (
    <div className="dashboard">
      <h1>ניהול דגלי תכונה</h1>

      <div className="chart-card">
        <h3>הוסף / עדכן דגל</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>מפתח
            <input value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} style={{ width: '100%' }} />
          </label>
          <label>אחוז Rollout
            <input type="number" min={0} max={100} value={draft.rolloutPercent}
              onChange={e => setDraft({ ...draft, rolloutPercent: Number(e.target.value) })} style={{ width: '100%' }} />
          </label>
          <label>תיאור
            <input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} style={{ width: '100%' }} />
          </label>
          <label>פעיל
            <input type="checkbox" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>תפקידי יעד:</strong>
            {ALL_ROLES.map(r => (
              <label key={r} style={{ marginInlineStart: 12 }}>
                <input type="checkbox" checked={draft.targetRoles.includes(r)}
                  onChange={e => {
                    if (e.target.checked) setDraft({ ...draft, targetRoles: [...draft.targetRoles, r] });
                    else setDraft({ ...draft, targetRoles: draft.targetRoles.filter(x => x !== r) });
                  }}
                /> {r}
              </label>
            ))}
          </div>
        </div>
        <button className="btn" onClick={save} style={{ marginTop: 12 }}>שמור</button>
      </div>

      <div className="chart-card">
        <h3>דגלים קיימים</h3>
        <table className="flags">
          <thead>
            <tr>
              <th>מפתח</th><th>פעיל</th><th>Rollout</th><th>תפקידים</th><th>תיאור</th><th></th>
            </tr>
          </thead>
          <tbody>
            {flags.map(f => (
              <tr key={f.id}>
                <td>{f.key}</td>
                <td><input type="checkbox" checked={f.enabled} onChange={() => toggle(f)} /></td>
                <td>{f.rolloutPercent}%</td>
                <td>{f.targetRoles.join(', ') || '—'}</td>
                <td>{f.description}</td>
                <td><button className="btn secondary" onClick={() => del(f.key)}>מחק</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
