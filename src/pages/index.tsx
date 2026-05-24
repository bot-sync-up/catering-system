import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { KpiCard } from '../components/KpiCard';

interface KpiResponse {
  ytdRevenue: number;
  ytdNet: number;
  ytdMargin: number;
  cashPosition: number;
  forecastNextMonth: number;
  retentionRate: number;
  pnl: Array<{ period: string; revenue: number; netIncome: number; margin: number }>;
  cashflow: Array<{ period: string; inflow: number; outflow: number; net: number; cumulative: number; isForecast?: boolean }>;
}

export default function Dashboard() {
  const [data, setData] = useState<KpiResponse | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/kpi').then(r => r.json()).then(setData);
  }, []);

  async function download(type: string, format: 'XLSX' | 'PDF') {
    setDownloading(`${type}-${format}`);
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const res = await fetch('/api/reports/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, format, from, to, officialOnly: type === 'VAT' }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}.${format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(null);
  }

  if (!data) return <div className="dashboard"><p>טוען נתונים...</p></div>;

  // Find the first forecast index to draw a reference line on charts
  const forecastIdx = data.cashflow.findIndex(r => r.isForecast);

  return (
    <div className="dashboard">
      <h1>לוח בקרה - דוחות BI</h1>

      <div className="kpi-grid">
        <KpiCard label="הכנסות שנה נוכחית" value={data.ytdRevenue} format="currency" />
        <KpiCard label="רווח נקי" value={data.ytdNet} format="currency" />
        <KpiCard label="מרווח" value={data.ytdMargin} format="percent" />
        <KpiCard label="מצב מזומנים נוכחי" value={data.cashPosition} format="currency" />
        <KpiCard label="תחזית חודש הבא" value={data.forecastNextMonth} format="currency" />
        <KpiCard label="שימור לקוחות" value={data.retentionRate} format="percent" />
      </div>

      <div className="actions">
        <button className="btn" onClick={() => download('PNL', 'XLSX')} disabled={!!downloading}>
          הורד P&L Excel
        </button>
        <button className="btn secondary" onClick={() => download('PNL', 'PDF')} disabled={!!downloading}>
          הורד P&L PDF
        </button>
        <button className="btn" onClick={() => download('CASHFLOW', 'XLSX')} disabled={!!downloading}>
          תזרים Excel
        </button>
        <button className="btn" onClick={() => download('VAT', 'XLSX')} disabled={!!downloading}>
          מע"מ Excel
        </button>
        <button className="btn" onClick={() => download('COGS_EVENT', 'XLSX')} disabled={!!downloading}>
          COGS לאירוע
        </button>
        <button className="btn" onClick={() => download('FORM_106', 'XLSX')} disabled={!!downloading}>
          טופס 106
        </button>
      </div>

      <div className="chart-card">
        <h3>רווח והפסד לפי חודש</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.pnl}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" reversed />
            <YAxis orientation="right" />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#4F46E5" name="הכנסות" />
            <Bar dataKey="netIncome" fill="#10B981" name="רווח נקי" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>תזרים מזומנים (כולל תחזית 6 חודשים)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data.cashflow}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" reversed />
            <YAxis orientation="right" />
            <Tooltip />
            <Legend />
            {forecastIdx > 0 && (
              <ReferenceLine x={data.cashflow[forecastIdx].period} stroke="#DC2626" label="תחזית" />
            )}
            <Line type="monotone" dataKey="inflow" stroke="#10B981" name="תקבולים" />
            <Line type="monotone" dataKey="outflow" stroke="#DC2626" name="תשלומים" />
            <Line type="monotone" dataKey="cumulative" stroke="#4F46E5" name="מצטבר" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
