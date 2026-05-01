'use client';
import { useState } from 'react';
import { trpc } from '~/lib/trpc-client';
import { X } from 'lucide-react';

export function CustomerCreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [type, setType] = useState<'B2B' | 'B2C' | 'INSTITUTION'>('B2B');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');

  const createMut = trpc.customer.create.useMutation();

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50" onClick={onClose}>
      <div
        className="card w-full max-w-md p-5 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">לקוח חדש</h2>
          <button onClick={onClose} className="btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const c = await createMut.mutateAsync({
              type,
              displayName,
              companyName: companyName || null,
              email: email || null,
              phone: phone || null,
              taxId: taxId || null,
            });
            onCreated(c.id);
          }}
        >
          <div>
            <label className="label">סוג לקוח</label>
            <div className="flex gap-1">
              {(['B2B', 'B2C', 'INSTITUTION'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn ${type === t ? 'bg-brand-600 text-white' : 'btn-ghost'}`}
                  onClick={() => setType(t)}
                >
                  {t === 'INSTITUTION' ? 'מוסד' : t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">שם</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          {type !== 'B2C' && (
            <div>
              <label className="label">שם חברה / מוסד</label>
              <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">אימייל</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">טלפון</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {type !== 'B2C' && (
            <div>
              <label className="label">ח.פ / ע.מ</label>
              <input className="input" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
          )}
          {createMut.error && <div className="text-sm text-red-600">{createMut.error.message}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'יוצר...' : 'צור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
