import { useEffect, useState } from 'react';
import { api, FUEL_HE } from '../api/client.js';
import { Link } from 'react-router-dom';

const empty = { plate: '', make: '', model: '', year: new Date().getFullYear(), fuel: 'PETROL', color: '', vin: '', currentKm: 0, driverId: '' };

export default function Vehicles() {
  const [list, setList] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');

  function load() {
    api.get('/vehicles', { params: q ? { q } : {} }).then((r) => setList(r.data));
  }
  useEffect(() => { load(); }, [q]);
  useEffect(() => { api.get('/drivers').then((r) => setDrivers(r.data)); }, []);

  async function save() {
    const payload = { ...editing };
    payload.year = Number(payload.year);
    payload.currentKm = Number(payload.currentKm || 0);
    if (!payload.driverId) delete payload.driverId;
    try {
      if (editing.id) await api.put(`/vehicles/${editing.id}`, payload);
      else await api.post('/vehicles', payload);
      setEditing(null);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'שגיאה בשמירה');
    }
  }

  async function del(v) {
    if (!confirm(`למחוק את הרכב ${v.plate}?`)) return;
    await api.delete(`/vehicles/${v.id}`);
    load();
  }

  return (
    <>
      <div className="page-header">
        <h2>רכבים</h2>
        <div className="row">
          <input placeholder="חיפוש..." value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
          <button onClick={() => setEditing({ ...empty })}>+ רכב חדש</button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>מס׳ רכב</th><th>יצרן</th><th>דגם</th><th>שנה</th><th>סוג דלק</th><th>נהג</th><th>מד</th><th></th></tr></thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id}>
                <td><Link to={`/vehicles/${v.id}`}><b>{v.plate}</b></Link></td>
                <td>{v.make}</td>
                <td>{v.model}</td>
                <td>{v.year}</td>
                <td>{FUEL_HE[v.fuel] || v.fuel}</td>
                <td>{v.driver?.name || '—'}</td>
                <td>{(v.currentKm || 0).toLocaleString('he-IL')}</td>
                <td className="row" style={{ gap: 6 }}>
                  <button className="ghost" onClick={() => setEditing({ ...v, driverId: v.driverId || '' })}>עריכה</button>
                  <button className="danger" onClick={() => del(v)}>מחיקה</button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} style={{ color: 'var(--muted)' }}>אין רכבים</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="modal">
            <h3>{editing.id ? 'עריכת רכב' : 'הוספת רכב'}</h3>
            <div className="grid grid-2">
              <div><label>מספר רכב</label><input value={editing.plate} onChange={(e) => setEditing({ ...editing, plate: e.target.value })} /></div>
              <div><label>שנה</label><input type="number" value={editing.year} onChange={(e) => setEditing({ ...editing, year: e.target.value })} /></div>
              <div><label>יצרן</label><input value={editing.make} onChange={(e) => setEditing({ ...editing, make: e.target.value })} /></div>
              <div><label>דגם</label><input value={editing.model} onChange={(e) => setEditing({ ...editing, model: e.target.value })} /></div>
              <div><label>סוג דלק</label>
                <select value={editing.fuel} onChange={(e) => setEditing({ ...editing, fuel: e.target.value })}>
                  {Object.entries(FUEL_HE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label>צבע</label><input value={editing.color || ''} onChange={(e) => setEditing({ ...editing, color: e.target.value })} /></div>
              <div><label>מס׳ שלדה</label><input value={editing.vin || ''} onChange={(e) => setEditing({ ...editing, vin: e.target.value })} /></div>
              <div><label>קילומטראז' נוכחי</label><input type="number" value={editing.currentKm || 0} onChange={(e) => setEditing({ ...editing, currentKm: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>נהג</label>
                <select value={editing.driverId || ''} onChange={(e) => setEditing({ ...editing, driverId: e.target.value || null })}>
                  <option value="">— ללא —</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label>הערות</label><textarea rows={2} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
            <div className="actions">
              <button onClick={save}>שמירה</button>
              <button className="ghost" onClick={() => setEditing(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
