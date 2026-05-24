import { useEffect, useState } from 'react';
import { api, PURPOSE_HE, formatDateHe } from '../api/client.js';

const empty = { vehicleId: '', date: new Date().toISOString().slice(0, 10), startKm: '', endKm: '', purpose: 'BUSINESS', origin: '', destination: '', notes: '' };

export default function Mileage() {
  const [list, setList] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [editing, setEditing] = useState(null);

  function load() { api.get('/mileage').then((r) => setList(r.data)); }
  useEffect(load, []);
  useEffect(() => { api.get('/vehicles').then((r) => setVehicles(r.data)); }, []);

  async function save() {
    const data = { ...editing };
    data.startKm = Number(data.startKm);
    data.endKm = Number(data.endKm);
    try {
      if (editing.id) await api.put(`/mileage/${editing.id}`, data);
      else await api.post('/mileage', data);
      setEditing(null);
      load();
    } catch (e) { alert(e.response?.data?.error || 'שגיאה'); }
  }

  async function del(m) {
    if (!confirm('למחוק?')) return;
    await api.delete(`/mileage/${m.id}`);
    load();
  }

  const total = list.reduce((s, m) => s + m.km, 0);
  const business = list.filter((m) => m.purpose === 'BUSINESS').reduce((s, m) => s + m.km, 0);

  return (
    <>
      <div className="page-header">
        <h2>נסועה</h2>
        <button onClick={() => setEditing({ ...empty })}>+ דיווח נסועה</button>
      </div>
      <div className="grid grid-3">
        <div className="stat"><div className="label">סה"כ ק"מ</div><div className="value">{total.toLocaleString('he-IL')}</div></div>
        <div className="stat success"><div className="label">עסקי</div><div className="value">{business.toLocaleString('he-IL')}</div></div>
        <div className="stat"><div className="label">פרטי</div><div className="value">{(total - business).toLocaleString('he-IL')}</div></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>תאריך</th><th>רכב</th><th>נהג</th><th>מטרה</th><th>מ-</th><th>אל</th><th>ק"מ</th><th></th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td>{formatDateHe(m.date)}</td>
                <td>{m.vehicle?.plate}</td>
                <td>{m.driver?.name || '—'}</td>
                <td><span className={`badge ${m.purpose === 'BUSINESS' ? 'green' : 'blue'}`}>{PURPOSE_HE[m.purpose]}</span></td>
                <td>{m.origin || '—'}</td>
                <td>{m.destination || '—'}</td>
                <td><b>{m.km}</b></td>
                <td className="row" style={{ gap: 6 }}>
                  <button className="ghost" onClick={() => setEditing({ ...m, date: m.date.slice(0, 10) })}>עריכה</button>
                  <button className="danger" onClick={() => del(m)}>מחיקה</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="modal">
            <h3>{editing.id ? 'עריכת נסועה' : 'דיווח נסועה'}</h3>
            <div className="grid grid-2">
              <div><label>רכב</label>
                <select value={editing.vehicleId} onChange={(e) => setEditing({ ...editing, vehicleId: e.target.value })}>
                  <option value="">— בחר —</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
              <div><label>תאריך</label><input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></div>
              <div><label>מד התחלה</label><input type="number" value={editing.startKm} onChange={(e) => setEditing({ ...editing, startKm: e.target.value })} /></div>
              <div><label>מד סיום</label><input type="number" value={editing.endKm} onChange={(e) => setEditing({ ...editing, endKm: e.target.value })} /></div>
              <div><label>מטרה</label>
                <select value={editing.purpose} onChange={(e) => setEditing({ ...editing, purpose: e.target.value })}>
                  {Object.entries(PURPOSE_HE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label>מ-</label><input value={editing.origin || ''} onChange={(e) => setEditing({ ...editing, origin: e.target.value })} /></div>
              <div><label>אל</label><input value={editing.destination || ''} onChange={(e) => setEditing({ ...editing, destination: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>הערות</label><textarea value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
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
