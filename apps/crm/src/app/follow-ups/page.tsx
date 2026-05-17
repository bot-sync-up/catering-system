'use client';
import { useState } from 'react';
import { trpc } from '~/lib/trpc-client';
import { formatDateTime } from '~/lib/utils';
import { Bell, Plus, CheckCircle, Clock } from 'lucide-react';

export default function FollowUpsPage() {
  const { data, refetch } = trpc.followUp.list.useQuery();
  const { data: customers } = trpc.customer.list.useQuery({ limit: 100 });
  const create = trpc.followUp.create.useMutation({ onSuccess: () => { refetch(); reset(); } });
  const complete = trpc.followUp.complete.useMutation({ onSuccess: () => refetch() });
  const snooze = trpc.followUp.snooze.useMutation({ onSuccess: () => refetch() });

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [customerId, setCustomerId] = useState('');

  const reset = () => { setTitle(''); setBody(''); setDueAt(''); setCustomerId(''); };

  const pending = data?.filter((f) => f.status === 'PENDING') ?? [];
  const done = data?.filter((f) => f.status === 'DONE') ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6" /> תזכורות ו-Follow-ups</h1>

      <section className="card p-4">
        <h3 className="font-semibold mb-3">תזכורת חדשה</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input" placeholder="כותרת" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="datetime-local" className="input" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          <select className="input md:col-span-2" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— לא משויך ללקוח —</option>
            {customers?.items.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
          <textarea className="input md:col-span-2" placeholder="פירוט..." value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="flex justify-end mt-3">
          <button
            className="btn-primary"
            disabled={!title || !dueAt || create.isPending}
            onClick={() =>
              create.mutate({
                title,
                body: body || undefined,
                dueAt: new Date(dueAt),
                customerId: customerId || undefined,
              })
            }
          >
            <Plus className="w-4 h-4" /> צור תזכורת
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> פתוחות ({pending.length})</h3>
        <ul className="divide-y divide-slate-100">
          {pending.map((f) => (
            <li key={f.id} className="py-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{f.title}</div>
                {f.body && <div className="text-sm text-slate-600">{f.body}</div>}
                <div className="text-xs text-slate-500 mt-1">
                  {formatDateTime(f.dueAt)}
                  {f.customer && ` · ${f.customer.displayName}`}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const d = prompt('דחה עד (yyyy-mm-dd hh:mm):', new Date(Date.now() + 86400000).toISOString().slice(0, 16));
                    if (d) snooze.mutate({ id: f.id, until: new Date(d) });
                  }}
                >
                  דחה
                </button>
                <button className="btn-primary" onClick={() => complete.mutate({ id: f.id })}>
                  <CheckCircle className="w-4 h-4" /> בוצע
                </button>
              </div>
            </li>
          ))}
          {!pending.length && <li className="py-4 text-sm text-slate-500">אין תזכורות פתוחות</li>}
        </ul>
      </section>

      {done.length > 0 && (
        <section className="card p-4 opacity-75">
          <h3 className="font-semibold mb-3">בוצעו ({done.length})</h3>
          <ul className="divide-y divide-slate-100">
            {done.slice(0, 10).map((f) => (
              <li key={f.id} className="py-2 text-sm text-slate-500 line-through">{f.title}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
