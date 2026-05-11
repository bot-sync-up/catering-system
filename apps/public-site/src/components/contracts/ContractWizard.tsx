'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Download, Loader2 } from 'lucide-react';
import { SignatureCanvas, type SignatureCanvasHandle } from './SignatureCanvas';
import type { ContractTemplate } from '@contracts/core';
import { renderTemplate } from '@contracts/core';

type Step = 0 | 1 | 2 | 3;

export function ContractWizard({ template }: { template: ContractTemplate }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const sigRef = useRef<SignatureCanvasHandle>(null);

  const [provider] = useState({
    name: 'סטודיו אמנון',
    email: 'studio@example.co.il',
    phone: '+972-50-000-0000',
  });
  const [client, setClient] = useState({ name: '', email: '', phone: '', idNumber: '' });
  const [fields, setFields] = useState<Record<string, string | number | boolean>>(() => {
    const init: Record<string, string | number | boolean> = {};
    for (const f of template.fields) if (f.default !== undefined) init[f.key] = f.default;
    return init;
  });
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [currency] = useState<'ILS' | 'USD' | 'EUR'>('ILS');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [createdContract, setCreatedContract] = useState<{ id: string; pdfUrl?: string } | null>(null);

  const preview = useMemo(() => {
    return renderTemplate(template.body, {
      provider,
      client,
      fields,
      totalAmount,
      currency,
      effectiveFrom,
      effectiveTo,
    });
  }, [template, provider, client, fields, totalAmount, currency, effectiveFrom, effectiveTo]);

  const canNext = (() => {
    if (step === 0) return client.name.length >= 2 && /.+@.+\..+/.test(client.email) && client.phone.length >= 7;
    if (step === 1) {
      return template.fields.filter((f) => f.required).every((f) => {
        const v = fields[f.key];
        return v !== undefined && v !== '' && v !== null;
      }) && totalAmount > 0 && !!effectiveFrom;
    }
    if (step === 2) return !!signatureDataUrl;
    return true;
  })();

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          title: template.title,
          provider,
          client,
          fields,
          totalAmount,
          currency,
          effectiveFrom,
          effectiveTo: effectiveTo || undefined,
          renewalReminderDays: template.defaultRenewalDays,
          signatureProvider: 'canvas',
          signatureDataUrl,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCreatedContract({ id: data.id, pdfUrl: data.pdfUrl });
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('שגיאה ביצירת החוזה. נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,420px]">
      {/* Wizard */}
      <div>
        <ol className="mb-8 flex items-center gap-3 text-xs">
          {['פרטי לקוח', 'פרטי חוזה', 'חתימה', 'סיום'].map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${step >= i ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink-muted'}`}>{i + 1}</span>
              <span className={step >= i ? 'font-semibold text-ink' : 'text-ink-muted'}>{label}</span>
              {i < 3 && <span className="mx-1 inline-block h-px w-6 bg-black/10" />}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="card"
          >
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">פרטי הלקוח</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="cl-name">שם מלא *</label>
                    <input id="cl-name" className="input" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="cl-id">תעודת זהות</label>
                    <input id="cl-id" className="input" inputMode="numeric" value={client.idNumber} onChange={(e) => setClient({ ...client, idNumber: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="cl-email">אימייל *</label>
                    <input id="cl-email" type="email" className="input" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="cl-phone">טלפון *</label>
                    <input id="cl-phone" className="input" inputMode="tel" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">פרטי החוזה</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {template.fields.map((f) => (
                    <div key={f.key}>
                      <label className="label" htmlFor={`f-${f.key}`}>
                        {f.label}{f.required && ' *'}
                      </label>
                      {f.type === 'boolean' ? (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            id={`f-${f.key}`}
                            type="checkbox"
                            checked={Boolean(fields[f.key])}
                            onChange={(e) => setFields({ ...fields, [f.key]: e.target.checked })}
                            className="h-4 w-4 rounded border-black/20"
                          />
                          הפעל
                        </label>
                      ) : (
                        <input
                          id={`f-${f.key}`}
                          className="input"
                          type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                          placeholder={f.placeholder}
                          value={(fields[f.key] as string | number | undefined) ?? ''}
                          onChange={(e) =>
                            setFields({
                              ...fields,
                              [f.key]: f.type === 'number' || f.type === 'currency' ? Number(e.target.value) : e.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  ))}
                  <div>
                    <label className="label" htmlFor="f-total">סה"כ (₪) *</label>
                    <input id="f-total" type="number" className="input" value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="label" htmlFor="f-from">תוקף מתאריך *</label>
                    <input id="f-from" type="date" className="input" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="f-to">תוקף עד</label>
                    <input id="f-to" type="date" className="input" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">חתימה דיגיטלית</h2>
                <p className="text-sm text-ink-muted">חתום במסגרת — באצבע במובייל או בעכבר במחשב.</p>
                <SignatureCanvas ref={sigRef} onChange={setSignatureDataUrl} />
                <details className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-ink-muted">
                  <summary className="cursor-pointer font-semibold text-ink">חלופה: DocuSign</summary>
                  <p className="mt-2">להפעיל אינטגרציית DocuSign? הוסיפו <code>DOCUSIGN_*</code> ל-env והחליפו את <code>signatureProvider</code> ל-docusign.</p>
                </details>
              </div>
            )}

            {step === 3 && createdContract && (
              <div className="space-y-4 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-700">✓</div>
                <h2 className="text-2xl font-bold">החוזה נוצר!</h2>
                <p className="text-ink-muted">מספר חוזה: <strong>{createdContract.id}</strong></p>
                <p className="text-sm text-ink-muted">נשלח עותק PDF למייל הלקוח. שמרנו עותק באחסון מאובטח.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {createdContract.pdfUrl && (
                    <a href={createdContract.pdfUrl} className="btn-primary" target="_blank" rel="noopener noreferrer">
                      <Download size={16} /> הורד PDF
                    </a>
                  )}
                  <button onClick={() => router.push('/contracts')} className="btn-secondary">חוזה נוסף</button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step < 3 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              className="btn-ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
            >
              <ArrowRight size={16} /> חזרה
            </button>
            {step < 2 ? (
              <button type="button" className="btn-primary" disabled={!canNext} onClick={() => setStep((s) => Math.min(2, s + 1) as Step)}>
                המשך <ArrowLeft size={16} />
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={!canNext || submitting} onClick={submit}>
                {submitting ? <><Loader2 size={16} className="animate-spin" /> שומר</> : 'אישור וחתימה'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live preview */}
      <aside className="card max-h-[80vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-ink-muted">תצוגה מקדימה</h3>
        <h4 className="mt-2 text-lg font-bold">{template.title}</h4>
        <p className="mt-1 text-xs text-ink-muted">{client.name || '—'} | {totalAmount.toLocaleString('he-IL')} {currency}</p>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink">{preview}</pre>
      </aside>
    </div>
  );
}
