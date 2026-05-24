'use client';
import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '~/lib/trpc-client';
import { formatDate } from '~/lib/utils';
import { Plus, Search } from 'lucide-react';
import { CustomerCreateDialog } from '~/components/CustomerCreateDialog';

const TYPES: { value: 'B2B' | 'B2C' | 'INSTITUTION' | ''; label: string }[] = [
  { value: '', label: 'הכל' },
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
  { value: 'INSTITUTION', label: 'מוסד' },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'B2B' | 'B2C' | 'INSTITUTION' | ''>('');
  const [openNew, setOpenNew] = useState(false);

  const { data, refetch, isLoading } = trpc.customer.list.useQuery({
    search: search || undefined,
    type: type || undefined,
    limit: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <button className="btn-primary" onClick={() => setOpenNew(true)}>
          <Plus className="w-4 h-4" /> לקוח חדש
        </button>
      </div>

      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pr-9"
            placeholder="חיפוש לפי שם / אימייל / טלפון / ח.פ"
          />
        </div>
        <div className="flex gap-1">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`btn ${type === t.value ? 'bg-brand-600 text-white' : 'btn-ghost'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-right px-4 py-2">שם</th>
              <th className="text-right px-4 py-2">סוג</th>
              <th className="text-right px-4 py-2">סטטוס</th>
              <th className="text-right px-4 py-2">תיוגים</th>
              <th className="text-right px-4 py-2">מנהל לקוח</th>
              <th className="text-right px-4 py-2">עודכן</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((c) => (
              <tr key={c.id} className="table-row-hover">
                <td className="px-4 py-2">
                  <Link href={`/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                    {c.displayName}
                  </Link>
                  {c.companyName && <div className="text-xs text-slate-500">{c.companyName}</div>}
                </td>
                <td className="px-4 py-2">
                  <span className="badge bg-slate-100 text-slate-700">{c.type}</span>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((ct) => (
                      <span
                        key={ct.tagId}
                        className="badge"
                        style={{ background: `${ct.tag.color}20`, color: ct.tag.color }}
                      >
                        {ct.tag.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-600">{c.accountManager?.name ?? '—'}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{formatDate(c.updatedAt)}</td>
              </tr>
            ))}
            {!isLoading && !data?.items.length && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500">
                  אין לקוחות תואמים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openNew && (
        <CustomerCreateDialog
          onClose={() => setOpenNew(false)}
          onCreated={() => {
            setOpenNew(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    INACTIVE: 'bg-slate-100 text-slate-700',
    CHURNED: 'bg-red-50 text-red-700',
    PROSPECT: 'bg-amber-50 text-amber-700',
  };
  const label: Record<string, string> = {
    ACTIVE: 'פעיל',
    INACTIVE: 'לא פעיל',
    CHURNED: 'נטש',
    PROSPECT: 'מתעניין',
  };
  return <span className={`badge ${map[status] ?? 'bg-slate-100'}`}>{label[status] ?? status}</span>;
}
