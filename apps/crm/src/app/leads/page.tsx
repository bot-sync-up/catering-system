'use client';
import Link from 'next/link';
import { trpc } from '~/lib/trpc-client';
import { formatCurrency, formatDate } from '~/lib/utils';

export default function LeadsListPage() {
  const { data } = trpc.lead.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">לידים</h1>
        <Link href="/pipeline" className="btn-primary">תצוגת Kanban</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="text-right px-4 py-2">כותרת</th>
              <th className="text-right px-4 py-2">לקוח</th>
              <th className="text-right px-4 py-2">שלב</th>
              <th className="text-right px-4 py-2">מקור</th>
              <th className="text-right px-4 py-2">ערך</th>
              <th className="text-right px-4 py-2">בעלים</th>
              <th className="text-right px-4 py-2">עודכן</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.map((l) => (
              <tr key={l.id} className="table-row-hover">
                <td className="px-4 py-2">
                  <Link href={`/leads/${l.id}`} className="text-brand-700 hover:underline font-medium">
                    {l.title}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {l.customer ? (
                    <Link href={`/customers/${l.customer.id}`} className="hover:underline">
                      {l.customer.displayName}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2"><span className="badge bg-slate-100">{l.stage.name}</span></td>
                <td className="px-4 py-2 text-xs text-slate-600">{l.source}</td>
                <td className="px-4 py-2 font-medium">{formatCurrency(l.value, l.currency)}</td>
                <td className="px-4 py-2 text-slate-600">{l.owner?.name ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{formatDate(l.updatedAt)}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">אין לידים</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
