import { useEffect, useState } from 'react';
import { api, formatDateHe, formatILS, DOC_TYPE_HE, ALERT_LEVEL_HE } from '../api/client.js';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    api.get('/vehicles').then((r) => setVehicles(r.data));
    api.get('/alerts?ack=false').then((r) => setAlerts(r.data));
    api.get('/documents?expiring=true').then((r) => setDocs(r.data));
  }, []);

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.active).length;
  const expiringSoon = docs.filter((d) => {
    const days = (new Date(d.expiry) - new Date()) / (1000 * 60 * 60 * 24);
    return days <= 30;
  }).length;

  return (
    <>
      <div className="page-header"><h2>לוח בקרה</h2></div>
      <div className="grid grid-4">
        <div className="stat"><div className="label">רכבים במערכת</div><div className="value">{totalVehicles}</div></div>
        <div className="stat success"><div className="label">פעילים</div><div className="value">{activeVehicles}</div></div>
        <div className="stat warning"><div className="label">תוקפים מתקרבים (30 יום)</div><div className="value">{expiringSoon}</div></div>
        <div className="stat danger"><div className="label">התראות פתוחות</div><div className="value">{alerts.length}</div></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>תוקפים מתקרבים</h3>
          <table>
            <thead><tr><th>רכב</th><th>סוג</th><th>תוקף</th></tr></thead>
            <tbody>
              {docs.slice(0, 8).map((d) => {
                const days = Math.ceil((new Date(d.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                const cls = days <= 7 ? 'red' : days <= 30 ? 'amber' : 'green';
                return (
                  <tr key={d.id}>
                    <td>{d.vehicle?.plate}</td>
                    <td>{DOC_TYPE_HE[d.type]}</td>
                    <td><span className={`badge ${cls}`}>{formatDateHe(d.expiry)} ({days} ימים)</span></td>
                  </tr>
                );
              })}
              {!docs.length && <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>אין תוקפים קרובים</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>התראות אחרונות</h3>
          {alerts.slice(0, 8).map((a) => (
            <div key={a.id} className={`alert-row ${a.level === 'EXPIRED' || a.level === 'D7' ? 'red' : ''}`}>
              <span className="badge amber">{ALERT_LEVEL_HE[a.level]}</span>
              <span>{a.message}</span>
            </div>
          ))}
          {!alerts.length && <div style={{ color: 'var(--muted)' }}>אין התראות פתוחות</div>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>רכבים</h3>
        <table>
          <thead><tr><th>מספר רכב</th><th>יצרן/דגם</th><th>שנה</th><th>נהג</th><th>מד אוץ׳</th><th></th></tr></thead>
          <tbody>
            {vehicles.slice(0, 8).map((v) => (
              <tr key={v.id}>
                <td><b>{v.plate}</b></td>
                <td>{v.make} {v.model}</td>
                <td>{v.year}</td>
                <td>{v.driver?.name || '—'}</td>
                <td>{(v.currentKm || 0).toLocaleString('he-IL')} ק"מ</td>
                <td><Link to={`/vehicles/${v.id}`}>פרטים</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
