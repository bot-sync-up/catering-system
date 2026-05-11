import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatDateHe, formatILS, FUEL_HE, DOC_TYPE_HE, EXPENSE_TYPE_HE, PURPOSE_HE, ALERT_LEVEL_HE } from '../api/client.js';

export default function VehicleDetail() {
  const { id } = useParams();
  const [v, setV] = useState(null);

  function load() {
    api.get(`/vehicles/${id}`).then((r) => setV(r.data));
  }
  useEffect(() => { load(); }, [id]);

  if (!v) return <div>טוען...</div>;

  return (
    <>
      <div className="page-header">
        <h2>{v.plate} — {v.make} {v.model}</h2>
        <a href={`/api/reports/monthly.pdf?vehicleId=${v.id}&year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`} target="_blank" rel="noreferrer">
          <button>הורד דוח חודשי PDF</button>
        </a>
      </div>

      <div className="grid grid-4">
        <div className="stat"><div className="label">שנת ייצור</div><div className="value">{v.year}</div></div>
        <div className="stat"><div className="label">סוג דלק</div><div className="value" style={{ fontSize: 16 }}>{FUEL_HE[v.fuel]}</div></div>
        <div className="stat"><div className="label">קילומטראז'</div><div className="value">{(v.currentKm || 0).toLocaleString('he-IL')}</div></div>
        <div className="stat"><div className="label">נהג</div><div className="value" style={{ fontSize: 16 }}>{v.driver?.name || '—'}</div></div>
      </div>

      {v.alerts?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>התראות פעילות</h3>
          {v.alerts.map((a) => (
            <div key={a.id} className={`alert-row ${a.level === 'EXPIRED' || a.level === 'D7' ? 'red' : ''}`}>
              <span className="badge amber">{ALERT_LEVEL_HE[a.level]}</span>
              <span>{a.message}</span>
              <button className="ghost right" onClick={async () => { await api.post(`/alerts/${a.id}/ack`); load(); }}>אשר</button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>תוקפים</h3>
          <table>
            <thead><tr><th>סוג</th><th>תוקף</th><th>ספק</th><th>עלות</th></tr></thead>
            <tbody>
              {v.documents.map((d) => {
                const days = Math.ceil((new Date(d.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                const cls = days < 0 ? 'red' : days <= 7 ? 'red' : days <= 30 ? 'amber' : 'green';
                return (
                  <tr key={d.id}>
                    <td>{DOC_TYPE_HE[d.type]}</td>
                    <td><span className={`badge ${cls}`}>{formatDateHe(d.expiry)}</span></td>
                    <td>{d.vendor || '—'}</td>
                    <td>{d.amount ? formatILS(d.amount) : '—'}</td>
                  </tr>
                );
              })}
              {!v.documents.length && <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>אין תוקפים</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>הוצאות אחרונות</h3>
          <table>
            <thead><tr><th>תאריך</th><th>סוג</th><th>ספק</th><th>סכום</th></tr></thead>
            <tbody>
              {v.expenses.map((e) => (
                <tr key={e.id}>
                  <td>{formatDateHe(e.date)}</td>
                  <td>{EXPENSE_TYPE_HE[e.type]}</td>
                  <td>{e.vendor || '—'}</td>
                  <td>{formatILS(e.amount)}</td>
                </tr>
              ))}
              {!v.expenses.length && <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>אין הוצאות</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>נסועה אחרונה</h3>
        <table>
          <thead><tr><th>תאריך</th><th>מטרה</th><th>מ-</th><th>אל</th><th>ק"מ</th></tr></thead>
          <tbody>
            {v.mileages.map((m) => (
              <tr key={m.id}>
                <td>{formatDateHe(m.date)}</td>
                <td>{PURPOSE_HE[m.purpose]}</td>
                <td>{m.origin || '—'}</td>
                <td>{m.destination || '—'}</td>
                <td>{m.km}</td>
              </tr>
            ))}
            {!v.mileages.length && <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>אין נסועה</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
