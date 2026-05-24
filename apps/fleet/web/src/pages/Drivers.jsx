import { useEffect, useState } from 'react';
import { api, formatDateHe } from '../api/client.js';

const empty = { name: '', phone: '', idNumber: '', licenseNumber: '', licenseExpiry: '', notes: '' };

export default function Drivers() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);

  function load() { api.get('/drivers').then((r) => setList(r.data)); }
  useEffect(load, []);

  async function save() {
    const data = { ...editing };
    if (data.licenseExpiry && !data.licenseExpiry.includes('T')) data.licenseExpiry = new Date(data.licenseExpiry).toISOString();
    try {
      if (editing.id) await api.put(`/drivers/${editing.id}`, data);
      else await api.post('/drivers', data);
      setEditing(null);
      load();
    } catch (e) { alert(e.response?.data?.error || 'שגיאה'); }
  }

  return (
    <>
      <div className="page-header">
        <h2>נהגים</h2>
        <button onClick={() => setEditing({ ...empty })}>+ נהג חדש</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>שם</th><th>טלפון</th><th>ת.ז.</th><th>רישיון</th><th>תוקף רישיון</th><th>רכבים</th><th></th></tr></thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.phone || '—'}</td>
                <td>{d.idNumber || '—'}</td>
                <td>{d.licenseNumber || '—'}</td>
                <td>{d.licenseExpiry ? formatDateHe(d.licenseExpiry) : '—'}</td>
                <td>{d.vehicles?.map((v) => v.plate).join(', ') || '—'}</td>
                <td><button className="ghost" onClick={() => setEditing(d)}>עריכה</button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>אין נהגים</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="modal">
            <h3>{editing.id ? 'עריכת נהג' : 'הוספת נהג'}</h3>
            <div className="grid grid-2">
              <div><label>שם מלא</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><label>טלפון</label><input value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div><label>תעודת זהות</label><input value={editing.idNumber || ''} onChange={(e) => setEditing({ ...editing, idNumber: e.target.value })} /></div>
              <div><label>מספר רישיון נהיגה</label><input value={editing.licenseNumber || ''} onChange={(e) => setEditing({ ...editing, licenseNumber: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>תוקף רישיון</label><input type="date" value={editing.licenseExpiry ? editing.licenseExpiry.slice(0, 10) : ''} onChange={(e) => setEditing({ ...editing, licenseExpiry: e.target.value })} /></div>
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
