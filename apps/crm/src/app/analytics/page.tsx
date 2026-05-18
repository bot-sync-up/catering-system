'use client';
import Link from 'next/link';
import { trpc } from '~/lib/trpc-client';
import { formatCurrency } from '~/lib/utils';
import { AlertTriangle, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: pipeline } = trpc.analytics.pipelineSummary.useQuery();
  const { data: atRisk } = trpc.analytics.atRiskCustomers.useQuery({ threshold: 0.4, limit: 50 });
  const { data: upsell } = trpc.analytics.upsellOpportunities.useQuery({ threshold: 0.3, limit: 50 });
  const { data: sources } = trpc.analytics.sourceBreakdown.useQuery();

  const totalValue = pipeline?.reduce((s, x) => s + x.totalValue, 0) ?? 0;
  const totalWeighted = pipeline?.reduce((s, x) => s + x.weightedValue, 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">אנליטיקה</h1>

      <section className="card p-4">
        <h3 className="font-semibold mb-3">סיכום Pipeline</h3>
        <div className="text-sm text-slate-600 mb-4">
          סה"כ: <span className="font-medium text-slate-900">{formatCurrency(totalValue)}</span> ·
          משוקלל: <span className="font-medium text-slate-900">{formatCurrency(totalWeighted)}</span>
        </div>
        <div className="space-y-2">
          {pipeline?.map((p) => {
            const max = Math.max(1, ...(pipeline?.map((x) => x.totalValue) ?? [1]));
            const pct = (p.totalValue / max) * 100;
            return (
              <div key={p.stage.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{p.stage.name} ({p.count})</span>
                  <span>{formatCurrency(p.totalValue)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" /> חיזוי נטישה
          </h3>
          <ul className="divide-y divide-slate-100">
            {atRisk?.map((c) => (
              <li key={c.id} className="py-2 flex justify-between">
                <Link href={`/customers/${c.id}`} className="hover:text-brand-700">{c.displayName}</Link>
                <span className="badge bg-red-50 text-red-700">{Math.round(c.churnScore * 100)}%</span>
              </li>
            ))}
            {!atRisk?.length && <li className="py-2 text-sm text-slate-500">אין נתונים</li>}
          </ul>
        </section>

        <section className="card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-emerald-700">
            <TrendingUp className="w-4 h-4" /> הזדמנויות Upsell
          </h3>
          <ul className="divide-y divide-slate-100">
            {upsell?.map((c) => (
              <li key={c.id} className="py-2 flex justify-between">
                <Link href={`/customers/${c.id}`} className="hover:text-brand-700">{c.displayName}</Link>
                <span className="badge bg-emerald-50 text-emerald-700">
                  {Math.round(c.upsellScore * 100)}% · {formatCurrency(c.ltv)}
                </span>
              </li>
            ))}
            {!upsell?.length && <li className="py-2 text-sm text-slate-500">אין נתונים</li>}
          </ul>
        </section>
      </div>

      <section className="card p-4">
        <h3 className="font-semibold mb-3">מקורות לידים (Attribution)</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 text-right">
            <tr>
              <th className="py-2">מקור</th>
              <th className="py-2">כמות</th>
              <th className="py-2">ערך כולל</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sources?.map((s) => (
              <tr key={s.source}>
                <td className="py-2">{s.source}</td>
                <td className="py-2">{s._count._all}</td>
                <td className="py-2">{formatCurrency(s._sum.value ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
