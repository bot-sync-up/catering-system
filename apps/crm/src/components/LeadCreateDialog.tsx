'use client';
import { useState } from 'react';
import { trpc } from '~/lib/trpc-client';
import { X } from 'lucide-react';

const SOURCES = [
  ['REFERRAL', 'הפניה'],
  ['ADVERTISEMENT', 'פרסומת'],
  ['ORGANIC', 'ארגוני'],
  ['EVENT', 'אירוע'],
  ['COLD_OUTREACH', 'פנייה קרה'],
  ['PARTNER', 'שותף'],
  ['WEBSITE', 'אתר'],
  ['OTHER', 'אחר'],
] as const;

export function LeadCreateDialog({
  pipelineId,
  stageId,
  onClose,
  onCreated,
}: {
  pipelineId: string;
  stageId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<typeof SOURCES[number][0]>('WEBSITE');
  const [value, setValue] = useState(0);
  const [customerId, setCustomerId] = useState<string>('');
  const [referredById, setReferredById] = useState<string>('');

  const { data: customers } = trpc.customer.list.useQuery({ limit: 100 });
  const create = trpc.lead.create.useMutation();

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50" onClick={onClose}>
      <div className="card w-full max-w-md p-5 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">ליד חדש</h2>
          <button onClick={onClose} className="btn-ghost"><X className="w-4 h-4" /></button>
        </div>

        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const lead = await create.mutateAsync({
              title,
              description: description || null,
              source,
              value,
              pipelineId,
              stageId,
              customerId: customerId || null,
              referredById: source === 'REFERRAL' ? (referredById || null) : null,
            });
            onCreated(lead.id);
          }}
        >
          <div>
            <label className="label">כותרת</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">תיאור</label>
            <textarea className="input min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">מקור</label>
              <select className="input" value={source} onChange={(e) => setSource(e.target.value as any)}>
                {SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ערך עסקה (ש"ח)</label>
              <input type="number" className="input" min={0} value={value} onChange={(e) => setValue(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="label">לקוח קיים (אופציונלי)</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— ללא —</option>
              {customers?.items.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
          </div>
          {source === 'REFERRAL' && (
            <div>
              <label className="label">לקוח שהמליץ</label>
              <select className="input" value={referredById} onChange={(e) => setReferredById(e.target.value)}>
                <option value="">— ללא —</option>
                {customers?.items.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
              </select>
            </div>
          )}
          {create.error && <div className="text-sm text-red-600">{create.error.message}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>ביטול</button>
            <button type="submit" className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'יוצר...' : 'צור ליד'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
