import { useEffect, useState } from 'react';
import { api, ALERT_LEVEL_HE, formatDateHe } from '../api/client.js';

export default function Alerts() {
  const [list, setList] = useState([]);
  const [showAck, setShowAck] = useState(false);

  function load() { api.get('/alerts', { params: { ack: showAck ? 'true' : 'false' } }).then((r) => setList(r.data)); }
  useEffect(load, [showAck]);

  async function ack(id) {
    await api.post(`/alerts/${id}/ack`);
    load();
  }

  return (
    <>
      <div className="page-header">
        <h2>התראות</h2>
        <button className="ghost" onClick={() => setShowAck((s) => !s)}>{showAck ? 'הצג פתוחות' : 'הצג היסטוריה'}</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>רכב</th><th>סוג</th><th>תאריך הפעלה</th><th>הודעה</th><th></th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>{a.vehicle?.plate}</td>
                <td><span className={`badge ${a.level === 'EXPIRED' || a.level === 'D7' ? 'red' : a.level === 'D30' ? 'amber' : 'blue'}`}>{ALERT_LEVEL_HE[a.level]}</span></td>
                <td>{formatDateHe(a.fireAt)}</td>
                <td>{a.message}</td>
                <td>{!a.acknowledged && <button className="ghost" onClick={() => ack(a.id)}>אשר</button>}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>אין התראות</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
