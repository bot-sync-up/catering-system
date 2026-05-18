'use client';
import { trpc } from '~/lib/trpc-client';
import { formatCurrency } from '~/lib/utils';
import { AlertTriangle, TrendingUp, Users, Target } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: customers } = trpc.customer.list.useQuery({ limit: 5 });
  const { data: pipeline } = trpc.analytics.pipelineSummary.useQuery();
  const { data: atRisk } = trpc.analytics.atRiskCustomers.useQuery({ threshold: 0.5, limit: 5 });
  const { data: upsell } = trpc.analytics.upsellOpportunities.useQuery({ threshold: 0.4, limit: 5 });
  const { data: sources } = trpc.analytics.sourceBreakdown.useQuery();

  const totalPipelineValue = pipeline?.reduce((s, x) => s + (x.totalValue ?? 0), 0) ?? 0;
  const weighted = pipeline?.reduce((s, x) => s + (x.weightedValue ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">דשבורד</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat icon={Users} label="לקוחות פעילים" value={customers?.items.length ?? 0} href="/customers" />
        <Stat icon={Target} label="ערך Pipeline" value={formatCurrency(totalPipelineValue)} />
        <Stat icon={TrendingUp} label="צפי משוקלל" value={formatCurrency(weighted)} />
        <Stat icon={AlertTriangle} label="לקוחות בסיכון" value={atRisk?.length ?? 0} href="/analytics" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card p-4">
          <h2 className="font-semibold mb-3">לקוחות אחרונים</h2>
          <ul className="divide-y divide-slate-100">
            {customers?.items.map((c) => (
              <li key={c.id} className="py-2 flex justify-between">
                <Link href={`/customers/${c.id}`} className="hover:text-brand-700">
                  {c.displayName}
                </Link>
                <span className="text-xs text-slate-500">{c.type}</span>
              </li>
            ))}
            {!customers?.items.length && <li className="text-sm text-slate-500 py-4">אין לקוחות עדיין</li>}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold mb-3">בסיכון לנטישה</h2>
          <ul className="divide-y divide-slate-100">
            {atRisk?.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <Link href={`/customers/${c.id}`} className="hover:text-brand-700">
                  {c.displayName}
                </Link>
                <span className="badge bg-red-50 text-red-700">{Math.round(c.churnScore * 100)}%</span>
              </li>
            ))}
            {!atRisk?.length && <li className="text-sm text-slate-500 py-4">אין נתונים</li>}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold mb-3">הזדמנויות Upsell</h2>
          <ul className="divide-y divide-slate-100">
            {upsell?.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <Link href={`/customers/${c.id}`} className="hover:text-brand-700">
                  {c.displayName}
                </Link>
                <span className="badge bg-emerald-50 text-emerald-700">{Math.round(c.upsellScore * 100)}%</span>
              </li>
            ))}
            {!upsell?.length && <li className="text-sm text-slate-500 py-4">אין נתונים</li>}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold mb-3">מקורות לידים</h2>
          <ul className="space-y-2">
            {sources?.map((s) => (
              <li key={s.source} className="flex justify-between text-sm">
                <span>{s.source}</span>
                <span className="text-slate-500">
                  {s._count._all} לידים · {formatCurrency(s._sum.value ?? 0)}
                </span>
              </li>
            ))}
            {!sources?.length && <li className="text-sm text-slate-500 py-4">אין נתונים</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: any;
  label: string;
  value: string | number;
  href?: string;
}) {
  const inner = (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="font-bold text-lg">{value}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
