'use client';
import { useEffect, useState } from 'react';

export default function StaffPage() {
  const today = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 16);
  const [from, setFrom] = useState(fmt(weekAgo));
  const [to, setTo] = useState(fmt(new Date(today.getTime() + 7 * 24 * 3600_000)));
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const r = await fetch('/api/prep', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'utilisation', from, to })
    }).then((r) => r.json());
    setRows(r);
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">ניצול עובדים</h1>
      <div className="card">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div><label className="label">מ-</label><input type="datetime-local" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label">עד-</label><input type="datetime-local" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <button className="btn" onClick={load}>רענן</button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-stone-500"><tr><th>עובד</th><th>שעות</th><th>ניצול %</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-stone-100">
                <td className="py-1">{r.name}</td>
                <td className="text-center">{(r.minutes / 60).toFixed(1)}</td>
                <td className="text-center">{r.utilisationPct.toFixed(1)}%</td>
                <td>
                  <div className="bg-stone-100 rounded h-2 w-full overflow-hidden">
                    <div className="bg-brand-500 h-full" style={{ width: Math.min(100, r.utilisationPct) + '%' }} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="text-center text-stone-500 py-4">אין נתונים בטווח שנבחר.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
