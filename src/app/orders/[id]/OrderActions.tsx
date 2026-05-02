'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ACTIONS_BY_STATUS: Record<string, Array<{ label: string; type: string; admin?: boolean; needsReason?: boolean }>> = {
  DRAFT: [
    { label: 'הגש לאישור', type: 'SUBMIT' },
    { label: 'בטל', type: 'CANCEL', needsReason: true },
  ],
  PENDING: [
    { label: 'אשר (מנהל)', type: 'APPROVE', admin: true },
    { label: 'דחה (מנהל)', type: 'REJECT', admin: true, needsReason: true },
    { label: 'העבר להמתנה', type: 'WAITLIST' },
    { label: 'בטל', type: 'CANCEL', needsReason: true },
  ],
  WAITLISTED: [
    { label: 'קדם מההמתנה', type: 'PROMOTE_FROM_WAITLIST' },
    { label: 'בטל', type: 'CANCEL', needsReason: true },
  ],
  APPROVED: [
    { label: 'הוצא למטבח', type: 'START_PREPARING' },
    { label: 'בטל', type: 'CANCEL', needsReason: true },
  ],
  PREPARING: [
    { label: 'שלח למשלוח', type: 'START_DELIVERY' },
    { label: 'בטל', type: 'CANCEL', needsReason: true },
  ],
  DELIVERING: [
    { label: 'סיים', type: 'COMPLETE' },
    { label: 'בטל', type: 'CANCEL', needsReason: true },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const actions = ACTIONS_BY_STATUS[status] ?? [];
  if (actions.length === 0) return null;

  async function fire(type: string, admin?: boolean, needsReason?: boolean) {
    setBusy(true);
    setErr(null);
    let reason: string | undefined;
    if (needsReason) {
      reason = window.prompt('סיבה?') ?? undefined;
      if (!reason) {
        setBusy(false);
        return;
      }
    }
    const body: Record<string, unknown> = { type, actor: 'ui' };
    if (reason) body.reason = reason;
    const res = await fetch(`/api/orders/${orderId}/transition`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(admin ? { 'x-admin': '1' } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(j.message || 'שגיאה');
    }
    setBusy(false);
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
      {actions.map((a) => (
        <button
          key={a.type}
          className={`btn ${a.type === 'CANCEL' || a.type === 'REJECT' ? 'btn-danger' : ''}`}
          disabled={busy}
          onClick={() => fire(a.type, a.admin, a.needsReason)}
        >
          {a.label}
        </button>
      ))}
      {err && <span style={{ color: 'crimson' }}>{err}</span>}
    </div>
  );
}
