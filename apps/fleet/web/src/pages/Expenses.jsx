import { useEffect, useState } from 'react';
import { api, EXPENSE_TYPE_HE, formatDateHe, formatILS } from '../api/client.js';

const empty = { vehicleId: '', type: 'FUEL', date: new Date().toISOString().slice(0, 10), amount: '', liters: '', pricePerLiter: '', mileage: '', vendor: '', description: '' };

export default function Expenses() {
  const [list, setList] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [filter, setFilter] = useState({ vehicleId: '', type: '', from: '', to: '' });

  function load() {
    const params = {};
    for (const [k, v] of Object.entries(filter)) if (v) params[k] = v;
    api.get('/expenses', { params }).then((r) => setList(r.data));
  }
  useEffect(load, [filter]);
  useEffect(() => { api.get('/vehicles').then((r) => setVehicles(r.data)); }, []);

  async function save() {
    const fd = new FormData();
    for (const [k, v] of Object.entries(editing)) {
      if (v !== '' && v !== null && v !== undefined && k !== 'id') fd.append(k, v);
    }
    if (file) fd.append('receipt', file);
    try {
      if (editing.id) await api.put(`/expenses/${editing.id}`, fd);
      else await api.post('/expenses', fd);
      setEditing(null); setFile(null);
      load();
    } catch (e) { alert(e.response?.data?.error || 'שגיאה'); }
  }

  async function del(e) {
    if (!confirm('למחוק?')) return;
    await api.delete(`/expenses/${e.id}`);
    load();
  }

  const totalSum = list.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <>
      <div className="page-header">
        <h2>הוצאות שוטפות — דלק / טיפולים / תיקונים / קנסות</h2>
        <button onClick={() => setEditing({ ...empty })}>+ הוצאה חדשה</button>
      </div>
      <div className="card">
        <div className="grid grid-4" style={{ marginBottom: 12 }}>
          <div><label>רכב</label>
            <select value={filter.vehicleId} onChange={(e) => setFilter({ ...filter, vehicleId: e.target.value })}>
              <option value="">— הכל —</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
          </div>
          <div><label>סוג</label>
            <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
              <option value="">— הכל —</option>
              {Object.entries(EXPENSE_TYPE_HE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label>מתאריך</label><input type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></div>
          <div><label>עד תאריך</label><input type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></div>
        </div>

        <div style={{ marginBottom: 8, color: 'var(--muted)' }}>סך הכל: <b>{formatILS(totalSum)}</b> ({list.length} רשומות)</div>
        <table>
          <thead><tr><th>תאריך</th><th>רכב</th><th>סוג</th><th>תיאור</th><th>ספק</th><th>ק"מ</th><th>סכום</th><th>קבלה</th><th></th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td>{formatDateHe(e.date)}</td>
                <td>{e.vehicle?.plate}</td>
                <td>{EXPENSE_TYPE_HE[e.type]}</td>
                <td>{e.description || '—'}</td>
                <td>{e.vendor || '—'}</td>
                <td>{e.mileage?.toLocaleString('he-IL') || '—'}</td>
                <td>{formatILS(e.amount)}</td>
                <td>{e.receiptUrl ? <a href={e.receiptUrl} target="_blank" rel="noreferrer">📎</a> : '—'}</td>
                <td className="row" style={{ gap: 6 }}>
                  <button className="ghost" onClick={() => setEditing({ ...e, date: e.date.slice(0, 10) })}>עריכה</button>
                  <button className="danger" onClick={() => del(e)}>מחיקה</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="modal">
            <h3>{editing.id ? 'עריכת הוצאה' : 'הוצאה חדשה'}</h3>
            <div className="grid grid-2">
              <div><label>רכב</label>
                <select value={editing.vehicleId} onChange={(e) => setEditing({ ...editing, vehicleId: e.target.value })}>
                  <option value="">— בחר —</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
              <div><label>סוג</label>
                <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                  {Object.entries(EXPENSE_TYPE_HE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label>תאריך</label><input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></div>
              <div><label>סכום (₪)</label><input type="number" step="0.01" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} /></div>
              {editing.type === 'FUEL' && <>
                <div><label>ליטרים</label><input type="number" step="0.01" value={editing.liters || ''} onChange={(e) => setEditing({ ...editing, liters: e.target.value })} /></div>
                <div><label>מחיר לליטר</label><input type="number" step="0.01" value={editing.pricePerLiter || ''} onChange={(e) => setEditing({ ...editing, pricePerLiter: e.target.value })} /></div>
              </>}
              <div><label>ק"מ בעת ההוצאה</label><input type="number" value={editing.mileage || ''} onChange={(e) => setEditing({ ...editing, mileage: e.target.value })} /></div>
              <div><label>ספק / תחנה</label><input value={editing.vendor || ''} onChange={(e) => setEditing({ ...editing, vendor: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>תיאור</label><textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>צילום קבלה</label><input type="file" onChange={(e) => setFile(e.target.files?.[0])} accept="image/*,application/pdf" /></div>
            </div>
            <div className="actions">
              <button onClick={save}>שמירה</button>
              <button className="ghost" onClick={() => { setEditing(null); setFile(null); }}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
