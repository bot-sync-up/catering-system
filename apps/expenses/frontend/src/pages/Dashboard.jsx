import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { expenses, budget } from '../api/client';
import { fmtMoney } from '../utils/format';

const COLORS = ['#3182ce', '#38a169', '#dd6b20', '#d53f8c', '#805ad5', '#319795', '#b7791f', '#c53030'];
const MONTHS_HE = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

export default function Dashboard() {
  const year = new Date().getFullYear();
  const [summary, setSummary] = useState(null);
  const [bva, setBva] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    expenses.summary(year).then((r) => setSummary(r.data));
    budget.vsActual(year).then((r) => setBva(r.data));
    budget.alerts({ acknowledged: false, year }).then((r) => setAlerts(r.data));
  }, []);

  const totalYear = summary?.byMonth.reduce((a, b) => a + b, 0) || 0;
  const topCoa = summary?.byCoa[0];
  const overruns = bva?.rows.filter((r) => r.overrun).length || 0;

  return (
    <>
      <h1 className="page-title">לוח בקרה — {year}</h1>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">סה"כ הוצאות השנה</div>
          <div className="value">{fmtMoney(totalYear)}</div>
        </div>
        <div className="kpi">
          <div className="label">סה"כ תקציב</div>
          <div className="value">{fmtMoney(bva?.totals.budget || 0)}</div>
        </div>
        <div className="kpi">
          <div className="label">חריגות פעילות</div>
          <div className="value" style={{ color: overruns > 0 ? '#c53030' : '#2f855a' }}>{overruns}</div>
        </div>
        <div className="kpi">
          <div className="label">סעיף מוביל</div>
          <div className="value" style={{ fontSize: '1.05rem' }}>{topCoa?.name || '—'}</div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card">
          <h2>התראות חריגה</h2>
          {alerts.slice(0, 5).map((a) => (
            <div key={a.id} className={`alert ${a.level === 'CRITICAL' ? 'error' : a.level === 'WARNING' ? 'warn' : 'info'}`}>
              <strong>{a.message}</strong>
              <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>חודש {a.month}/{a.year}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>הוצאות לפי חודש</h2>
        {summary && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary.byMonth.map((v, i) => ({ month: MONTHS_HE[i], total: v }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" reversed />
              <YAxis orientation="right" />
              <Tooltip formatter={(v) => fmtMoney(v)} />
              <Bar dataKey="total" fill="#3182ce" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h2>פילוח הוצאות לפי חשבון (Top 8)</h2>
        {summary && (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={summary.byCoa.slice(0, 8)}
                dataKey="total"
                nameKey="name"
                outerRadius={110}
                label={(e) => e.name}
              >
                {summary.byCoa.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtMoney(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
