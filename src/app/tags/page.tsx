'use client';
import { useState } from 'react';
import { trpc } from '~/lib/trpc-client';
import { Plus, Trash2 } from 'lucide-react';

export default function TagsPage() {
  const { data, refetch } = trpc.tag.list.useQuery();
  const create = trpc.tag.create.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.tag.delete.useMutation({ onSuccess: () => refetch() });

  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [kind, setKind] = useState<'VIP' | 'RETURNING' | 'NEW' | 'AT_RISK' | 'CUSTOM'>('CUSTOM');

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">תיוגים</h1>

      <section className="card p-4">
        <h3 className="font-semibold mb-3">תיוג חדש</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">שם</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">סוג</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="CUSTOM">מותאם</option>
              <option value="VIP">VIP</option>
              <option value="RETURNING">חוזר</option>
              <option value="NEW">חדש</option>
              <option value="AT_RISK">בסיכון</option>
            </select>
          </div>
          <div>
            <label className="label">צבע</label>
            <input type="color" className="input h-9 w-14 p-1" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <button
            className="btn-primary"
            disabled={!name}
            onClick={() => { create.mutate({ name, color, kind }); setName(''); }}
          >
            <Plus className="w-4 h-4" /> הוסף
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h3 className="font-semibold mb-3">תיוגים קיימים</h3>
        <ul className="divide-y divide-slate-100">
          {data?.map((t) => (
            <li key={t.id} className="py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="badge" style={{ background: `${t.color}20`, color: t.color }}>{t.name}</span>
                <span className="text-xs text-slate-500">{t.kind}</span>
              </div>
              <button className="btn-ghost text-red-600" onClick={() => remove.mutate({ id: t.id })}>
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
          {!data?.length && <li className="py-4 text-sm text-slate-500">אין תיוגים</li>}
        </ul>
      </section>
    </div>
  );
}
