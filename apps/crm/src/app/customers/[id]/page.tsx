'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '~/lib/trpc-client';
import { formatCurrency, formatDate, formatDateTime } from '~/lib/utils';
import {
  Mail, Phone, Globe, Building2, User as UserIcon, MapPin, FileText,
  Calendar, Tag as TagIcon, MessageSquare, AlertTriangle, TrendingUp, Plus, Trash2,
} from 'lucide-react';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params?.id as string;
  const { data: c, refetch } = trpc.customer.byId.useQuery({ id: customerId });
  const { data: tags } = trpc.tag.list.useQuery();
  const { data: users } = trpc.user.list.useQuery();

  const addNote = trpc.customer.addNote.useMutation({ onSuccess: () => refetch() });
  const addTag = trpc.customer.addTag.useMutation({ onSuccess: () => refetch() });
  const removeTag = trpc.customer.removeTag.useMutation({ onSuccess: () => refetch() });
  const addContact = trpc.customer.addContactPerson.useMutation({ onSuccess: () => refetch() });
  const addAddr = trpc.customer.addAddress.useMutation({ onSuccess: () => refetch() });
  const addDoc = trpc.customer.addDocument.useMutation({ onSuccess: () => refetch() });
  const assignAm = trpc.customer.assignAccountManager.useMutation({ onSuccess: () => refetch() });
  const update = trpc.customer.update.useMutation({ onSuccess: () => refetch() });

  const [tab, setTab] = useState<'overview' | 'history' | 'documents' | 'meetings' | 'relations'>('overview');
  const [noteBody, setNoteBody] = useState('');
  const [newContact, setNewContact] = useState({ fullName: '', role: '', email: '', phone: '' });
  const [newAddr, setNewAddr] = useState({ street: '', city: '', postalCode: '' });
  const [newDoc, setNewDoc] = useState({ title: '', url: '' });

  if (!c) return <div className="text-slate-500">טוען...</div>;

  const churnPct = Math.round(c.churnScore * 100);
  const upsellPct = Math.round(c.upsellScore * 100);
  const usedTagIds = new Set(c.tags.map((t) => t.tagId));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-brand-100 text-brand-700 grid place-items-center">
              {c.type === 'B2C' ? <UserIcon className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{c.displayName}</h1>
              <div className="text-sm text-slate-500">
                {c.companyName ?? c.type} · {c.taxId ?? ''}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {c.tags.map((ct) => (
              <span
                key={ct.tagId}
                className="badge cursor-pointer"
                style={{ background: `${ct.tag.color}20`, color: ct.tag.color }}
                onClick={() => removeTag.mutate({ customerId: c.id, tagId: ct.tagId })}
                title="לחץ להסרה"
              >
                {ct.tag.name} ×
              </span>
            ))}
            <select
              className="input w-auto text-xs py-0.5"
              value=""
              onChange={(e) => {
                if (e.target.value) addTag.mutate({ customerId: c.id, tagId: e.target.value });
              }}
            >
              <option value="">+ הוסף תיוג</option>
              {tags?.filter((t) => !usedTagIds.has(t.id)).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <ScoreBox label="סיכון נטישה" pct={churnPct} icon={AlertTriangle} color="red" />
          <ScoreBox label="פוטנציאל Upsell" pct={upsellPct} icon={TrendingUp} color="emerald" />
          <div className="card p-3 text-center min-w-[140px]">
            <div className="text-xs text-slate-500">LTV</div>
            <div className="font-bold text-lg">{formatCurrency(c.ltv)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1">
        {[
          { k: 'overview', label: 'סקירה' },
          { k: 'history', label: 'היסטוריה' },
          { k: 'documents', label: 'מסמכים' },
          { k: 'meetings', label: 'פגישות' },
          { k: 'relations', label: 'קשרים' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <section className="card p-4">
              <h3 className="font-semibold mb-3">פרטי קשר</h3>
              <ul className="space-y-2 text-sm">
                {c.email && <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{c.email}</li>}
                {c.phone && <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{c.phone}</li>}
                {c.website && <li className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" />{c.website}</li>}
              </ul>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-1">מנהל לקוח</div>
                <select
                  className="input"
                  value={c.accountManagerId ?? ''}
                  onChange={(e) => assignAm.mutate({ customerId: c.id, userId: e.target.value || null })}
                >
                  <option value="">— לא מוקצה —</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="card p-4">
              <h3 className="font-semibold mb-3 flex items-center justify-between">
                אנשי קשר
                <span className="text-xs text-slate-500">{c.contactPersons.length}</span>
              </h3>
              <ul className="space-y-2">
                {c.contactPersons.map((p) => (
                  <li key={p.id} className="text-sm border-b border-slate-100 pb-2">
                    <div className="font-medium">{p.fullName} {p.isPrimary && <span className="badge bg-brand-50 text-brand-700">ראשי</span>}</div>
                    {p.role && <div className="text-xs text-slate-500">{p.role}</div>}
                    {p.email && <div className="text-xs">{p.email}</div>}
                    {p.phone && <div className="text-xs">{p.phone}</div>}
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-2">
                <input className="input" placeholder="שם מלא" value={newContact.fullName} onChange={(e) => setNewContact({ ...newContact, fullName: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="תפקיד" value={newContact.role} onChange={(e) => setNewContact({ ...newContact, role: e.target.value })} />
                  <input className="input" placeholder="טלפון" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
                </div>
                <input className="input" placeholder="אימייל" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                <button
                  className="btn-primary w-full"
                  disabled={!newContact.fullName}
                  onClick={async () => {
                    await addContact.mutateAsync({ customerId: c.id, ...newContact });
                    setNewContact({ fullName: '', role: '', email: '', phone: '' });
                  }}
                >
                  <Plus className="w-4 h-4" /> הוסף איש קשר
                </button>
              </div>
            </section>

            <section className="card p-4">
              <h3 className="font-semibold mb-3 flex items-center justify-between">
                כתובות
                <span className="text-xs text-slate-500">{c.addresses.length}</span>
              </h3>
              <ul className="space-y-2 text-sm">
                {c.addresses.map((a) => (
                  <li key={a.id} className="flex gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div>{a.street}, {a.city}</div>
                      {a.postalCode && <div className="text-xs text-slate-500">מיקוד {a.postalCode}</div>}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-2">
                <input className="input" placeholder="רחוב" value={newAddr.street} onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="עיר" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} />
                  <input className="input" placeholder="מיקוד" value={newAddr.postalCode} onChange={(e) => setNewAddr({ ...newAddr, postalCode: e.target.value })} />
                </div>
                <button
                  className="btn-primary w-full"
                  disabled={!newAddr.street || !newAddr.city}
                  onClick={async () => {
                    await addAddr.mutateAsync({ customerId: c.id, ...newAddr });
                    setNewAddr({ street: '', city: '', postalCode: '' });
                  }}
                >
                  <Plus className="w-4 h-4" /> הוסף כתובת
                </button>
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <section className="card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> פתקיות ופעילות</h3>
              <div className="space-y-2 mb-4">
                <textarea
                  className="input min-h-[80px]"
                  placeholder="הוסף הערה..."
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    className="btn-primary"
                    disabled={!noteBody}
                    onClick={async () => {
                      await addNote.mutateAsync({ customerId: c.id, body: noteBody });
                      setNoteBody('');
                    }}
                  >
                    שמור הערה
                  </button>
                </div>
              </div>
              <ul className="space-y-3">
                {c.notesList.map((n) => (
                  <li key={n.id} className="border-r-2 border-brand-200 pr-3">
                    <div className="text-xs text-slate-500">{n.author.name} · {formatDateTime(n.createdAt)}</div>
                    <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                  </li>
                ))}
                {!c.notesList.length && <li className="text-sm text-slate-500">אין הערות</li>}
              </ul>
            </section>

            <section className="card p-4">
              <h3 className="font-semibold mb-3">לידים פעילים</h3>
              <ul className="divide-y divide-slate-100">
                {c.leads.map((l) => (
                  <li key={l.id} className="py-2 flex justify-between text-sm">
                    <Link href={`/leads/${l.id}`} className="text-brand-700 hover:underline">{l.title}</Link>
                    <div className="flex gap-2 items-center">
                      <span className="badge bg-slate-100">{l.stage.name}</span>
                      <span>{formatCurrency(l.value, l.currency)}</span>
                    </div>
                  </li>
                ))}
                {!c.leads.length && <li className="py-2 text-sm text-slate-500">אין לידים</li>}
              </ul>
            </section>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <section className="card p-4">
          <h3 className="font-semibold mb-3">היסטוריית פעילות</h3>
          <ul className="space-y-2">
            {c.activities.map((a) => (
              <li key={a.id} className="text-sm flex gap-3">
                <span className="text-slate-400 text-xs w-32 flex-shrink-0">{formatDateTime(a.createdAt)}</span>
                <span className="font-medium">{a.actor.name}</span>
                <span className="text-slate-600">{activityLabel(a.kind)}</span>
              </li>
            ))}
            {!c.activities.length && <li className="text-sm text-slate-500">אין פעילות</li>}
          </ul>
        </section>
      )}

      {tab === 'documents' && (
        <section className="card p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> מסמכים</h3>
          </div>
          <ul className="divide-y divide-slate-100 mb-4">
            {c.documents.map((d) => (
              <li key={d.id} className="py-2 flex justify-between text-sm">
                <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{d.title}</a>
                <span className="text-xs text-slate-500">{d.kind} · {formatDate(d.createdAt)}</span>
              </li>
            ))}
            {!c.documents.length && <li className="py-2 text-sm text-slate-500">אין מסמכים</li>}
          </ul>
          <div className="flex gap-2">
            <input className="input" placeholder="כותרת" value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} />
            <input className="input" placeholder="https://..." value={newDoc.url} onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })} />
            <button
              className="btn-primary"
              disabled={!newDoc.title || !newDoc.url}
              onClick={async () => {
                await addDoc.mutateAsync({ customerId: c.id, title: newDoc.title, url: newDoc.url });
                setNewDoc({ title: '', url: '' });
              }}
            >
              <Plus className="w-4 h-4" /> הוסף
            </button>
          </div>
        </section>
      )}

      {tab === 'meetings' && (
        <section className="card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> פגישות</h3>
          <ul className="divide-y divide-slate-100">
            {c.meetings.map((m) => (
              <li key={m.id} className="py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{m.title}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(m.startsAt)}</span>
                </div>
                {m.location && <div className="text-xs text-slate-500">{m.location}</div>}
              </li>
            ))}
            {!c.meetings.length && <li className="py-2 text-sm text-slate-500">אין פגישות</li>}
          </ul>
        </section>
      )}

      {tab === 'relations' && (
        <section className="card p-4">
          <h3 className="font-semibold mb-3">קשרים ללקוחות אחרים</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-2">מקושר אל</h4>
              <ul className="text-sm space-y-1">
                {c.relationsFrom.map((r) => (
                  <li key={r.id}>
                    <Link href={`/customers/${r.to.id}`} className="text-brand-700 hover:underline">
                      {r.to.displayName}
                    </Link>
                    <span className="text-xs text-slate-500"> ({r.kind})</span>
                  </li>
                ))}
                {!c.relationsFrom.length && <li className="text-slate-500">—</li>}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-2">מקושר מ</h4>
              <ul className="text-sm space-y-1">
                {c.relationsTo.map((r) => (
                  <li key={r.id}>
                    <Link href={`/customers/${r.from.id}`} className="text-brand-700 hover:underline">
                      {r.from.displayName}
                    </Link>
                    <span className="text-xs text-slate-500"> ({r.kind})</span>
                  </li>
                ))}
                {!c.relationsTo.length && <li className="text-slate-500">—</li>}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function activityLabel(kind: string) {
  const m: Record<string, string> = {
    CREATED: 'יצר את הלקוח',
    UPDATED: 'עדכן פרטי לקוח',
    STAGE_CHANGED: 'העביר ליד בין שלבים',
    NOTE_ADDED: 'הוסיף הערה',
    TAG_ADDED: 'הוסיף תיוג',
    TAG_REMOVED: 'הסיר תיוג',
    DOC_ADDED: 'הוסיף מסמך',
    ASSIGNED: 'הגדיר מנהל לקוח',
  };
  return m[kind] ?? kind;
}

function ScoreBox({ label, pct, icon: Icon, color }: { label: string; pct: number; icon: any; color: 'red' | 'emerald' }) {
  const colorMap = {
    red: 'text-red-600 bg-red-50',
    emerald: 'text-emerald-600 bg-emerald-50',
  };
  return (
    <div className="card p-3 text-center min-w-[140px]">
      <div className={`w-8 h-8 rounded-full grid place-items-center mx-auto mb-1 ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-bold text-lg">{pct}%</div>
    </div>
  );
}
