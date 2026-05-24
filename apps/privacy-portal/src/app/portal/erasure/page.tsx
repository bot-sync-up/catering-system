"use client";
import { useState } from "react";

export default function ErasurePage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await fetch("/api/privacy/erasure/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          reason: reason || undefined,
          scope: { marketing: true, profile: true, orders: false, events: true },
        }),
      });
      if (!r.ok && r.status !== 202) throw new Error(await r.text());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    }
  }

  return (
    <section>
      <h1>בקשת מחיקה (זכות להישכח)</h1>
      <p>
        מילוי הטופס יזניק תהליך אנונימיזציה של פרטיך מהמערכות שלנו. שים לב: חשבוניות מס נשמרות
        בתוקף החוק עד 7 שנים, ויעברו ניתוק פרטים מזהים אך לא יימחקו.
      </p>
      <div className="alert">
        תישלח אליך הודעה לאישור סופי. רק לאחר הקלקה על הקישור — הבקשה תוצא לפועל.
      </div>

      {sent ? (
        <div className="alert">נשלח קישור אישור לאימייל שצוין (אם הוא קיים אצלנו).</div>
      ) : (
        <form onSubmit={submit}>
          <label>
            אימייל
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            סיבת המחיקה (אופציונלי)
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label style={{ flexDirection: "row", display: "flex", gap: 8 }}>
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
            הבנתי שחשבוניות יעברו אנונימיזציה ולא יימחקו
          </label>
          <button className="danger" disabled={!confirm}>
            שלח בקשת מחיקה
          </button>
          {error && <div className="alert error">{error}</div>}
        </form>
      )}
    </section>
  );
}
