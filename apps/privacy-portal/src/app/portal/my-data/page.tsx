"use client";
import { useState } from "react";

type Status = "idle" | "submitting" | "sent" | "error";

export default function MyDataPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const r = await fetch("/api/privacy/sar/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, fullName: fullName || undefined }),
      });
      if (!r.ok && r.status !== 202) throw new Error(await r.text());
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "שגיאה בלתי ידועה");
    }
  }

  return (
    <section>
      <h1>בקשה לעיון במידע אישי</h1>
      <p>
        כל הזכויות שמורות לך: לקבל עותק מלא של המידע השמור עלייך — כולל פרטי לקוח, היסטוריית הזמנות,
        חשבוניות, תשלומים ואירועים בחשבון.
      </p>
      <p className="muted">
        תישלח אליך הודעת אימות. רק לאחר אישור הקישור תופיע הבקשה לעיבוד.
      </p>

      {status === "sent" ? (
        <div className="alert">
          הבקשה התקבלה. במידה שכתובת האימייל נמצאת אצלנו, נשלח אליה קישור אימות. יש לאמת תוך 30 ימים.
        </div>
      ) : (
        <form onSubmit={submit}>
          <label>
            אימייל
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.co.il"
            />
          </label>
          <label>
            שם מלא (אופציונלי)
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <button disabled={status === "submitting"}>
            {status === "submitting" ? "שולח..." : "שלח בקשה"}
          </button>
          {error && <div className="alert error">{error}</div>}
        </form>
      )}
    </section>
  );
}
