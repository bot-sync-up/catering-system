import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../lib/api';

export function Dashboard() {
  const kpi = useQuery({ queryKey: ['kpi'], queryFn: async () => (await api.get('/reports/kpi')).data });
  const timeline = useQuery({ queryKey: ['timeline'], queryFn: async () => (await api.get('/reports/timeline')).data });

  if (kpi.isLoading) return <div>טוען...</div>;
  const k = kpi.data;

  return (
    <>
      <div className="page-header"><h2>לוח בקרה</h2></div>

      <div className="kpi-grid">
        <Kpi label="לידים סה״כ" value={k?.totalLeads ?? 0} />
        <Kpi label="לידים חדשים (30 יום)" value={k?.newLeads ?? 0} />
        <Kpi label="סה״כ שליחות" value={k?.totalSends ?? 0} />
        <Kpi label="NPS" value={k?.nps ?? 0} suffix="" />
        <Kpi label="שיעור פתיחה" value={pct(k?.openRate ?? 0)} />
        <Kpi label="שיעור הקלקה" value={pct(k?.clickRate ?? 0)} />
        <Kpi label="שיעור המרה" value={pct(k?.convRate ?? 0)} />
        <Kpi label="פניות פתוחות" value={k?.openTickets ?? 0} />
      </div>

      <div className="card">
        <h3>שליחות לאורך זמן</h3>
        <div style={{ height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={timeline.data?.items ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={(d) => new Date(d).toLocaleDateString('he-IL')} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sent" stroke="#1e40af" name="נשלח" />
              <Line type="monotone" dataKey="opened" stroke="#16a34a" name="נפתח" />
              <Line type="monotone" dataKey="clicked" stroke="#d97706" name="הקלקה" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}{suffix ?? ''}</div>
    </div>
  );
}

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}
