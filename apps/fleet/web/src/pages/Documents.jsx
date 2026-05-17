import { useEffect, useState } from 'react';
import { api, DOC_TYPE_HE, formatDateHe } from '../api/client.js';

const empty = { vehicleId: '', type: 'TEST', expiry: '', issueDate: '', amount: '', vendor: '', policyNo: '', notes: '' };

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);

  function load() { api.get('/documents').then((r) => setDocs(r.data)); }
  useEffect(() => {
    load();
    api.get('/vehicles').then((r) => setVehicles(r.data));
  }, []);

  async function save() {
    const fd = new FormData();
    for (const [k, v] of Object.entries(editing)) {
      if (v !== '' && v !== null && v !== undefined && k !== 'id') fd.append(k, v);
    }
    if (file) fd.append('file', file);
    try {
      if (editing.id) await api.put(`/documents/${editing.id}`, fd);
      else await api.post('/documents', fd);
      setEditing(null); setFile(null);
      load();
    } catch (e) { alert(e.response?.data?.error || 'שגיאה'); }
  }

  async function del(d) {
    if (!confirm('למחוק?')) return;
    await api.delete(`/documents/${d.id}`);
    load();
  }

  return (
    <>
      <div className="page-header">
        <h2>תוקפים — טסט / ביטוח / רישוי</h2>
        <button onClick={() => setEditing({ ...empty })}>+ תוקף חדש</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>רכב</th><th>סוג</th><th>תוקף</th><th>ספק</th><th>פוליסה</th><th>עלות</th><th>קובץ</th><th></th></tr></thead>
          <tbody>
            {docs.map((d) => {
              const days = Math.ceil((new Date(d.expiry) - new Date()) / (1000 * 60 * 60 * 24));
              const cls = days < 0 ? 'red' : days <= 7 ? 'red' : days <= 30 ? 'amber' : 'green';
              return (
                <tr key={d.id}>
                  <td>{d.vehicle?.plate}</td>
                  <td>{DOC_TYPE_HE[d.type]}</td>
                  <td><span className={`badge ${cls}`}>{formatDateHe(d.expiry)} ({days}י)</span></td>
                  <td>{d.vendor || '—'}</td>
                  <td>{d.policyNo || '—'}</td>
                  <td>{d.amount ? d.amount.toLocaleString('he-IL') + ' ₪' : '—'}</td>
                  <td>{d.fileUrl ? <a href={d.fileUrl} target="_blank" rel="noreferrer">📎</a> : '—'}</td>
                  <td className="row" style={{ gap: 6 }}>
                    <button className="ghost" onClick={() => setEditing({ ...d, expiry: d.expiry?.slice(0, 10), issueDate: d.issueDate?.slice(0, 10) || '' })}>עריכה</button>
                    <button className="danger" onClick={() => del(d)}>מחיקה</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="modal">
            <h3>{editing.id ? 'עריכת תוקף' : 'תוקף חדש'}</h3>
            <div className="grid grid-2">
              <div><label>רכב</label>
                <select value={editing.vehicleId} onChange={(e) => setEditing({ ...editing, vehicleId: e.target.value })}>
                  <option value="">— בחר —</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} ({v.make} {v.model})</option>)}
                </select>
              </div>
              <div><label>סוג</label>
                <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                  {Object.entries(DOC_TYPE_HE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label>תאריך הוצאה</label><input type="date" value={editing.issueDate || ''} onChange={(e) => setEditing({ ...editing, issueDate: e.target.value })} /></div>
              <div><label>תוקף עד</label><input type="date" value={editing.expiry || ''} onChange={(e) => setEditing({ ...editing, expiry: e.target.value })} /></div>
              <div><label>ספק / חברה</label><input value={editing.vendor || ''} onChange={(e) => setEditing({ ...editing, vendor: e.target.value })} /></div>
              <div><label>מס׳ פוליסה</label><input value={editing.policyNo || ''} onChange={(e) => setEditing({ ...editing, policyNo: e.target.value })} /></div>
              <div><label>עלות / פרמיה (₪)</label><input type="number" value={editing.amount || ''} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} /></div>
              <div><label>צילום מסמך</label><input type="file" onChange={(e) => setFile(e.target.files?.[0])} accept="image/*,application/pdf" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>הערות</label><textarea value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
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
