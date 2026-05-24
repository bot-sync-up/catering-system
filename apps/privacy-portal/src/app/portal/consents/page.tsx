"use client";
import { useState } from "react";

const CHANNELS = ["EMAIL", "SMS", "WHATSAPP", "PUSH", "VOICE"] as const;
type Channel = (typeof CHANNELS)[number];

export default function ConsentsPage() {
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("marketing");
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [msg, setMsg] = useState<string | null>(null);

  async function optIn() {
    setMsg(null);
    const r = await fetch("/api/privacy/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, channel, purpose }),
    });
    setMsg(r.ok ? "נשלח אימות לאישור (double opt-in)." : "שגיאה. ודא שמילאת אימייל תקין.");
  }

  async function optOut() {
    setMsg(null);
    const u = new URL(`/api/privacy/consent/${channel}`, window.location.origin);
    u.searchParams.set("email", email);
    u.searchParams.set("purpose", purpose);
    const r = await fetch(u.toString(), { method: "DELETE" });
    setMsg(r.ok ? "ההסכמה הוסרה. לא תקבל פניות נוספות לערוץ זה למטרה זו." : "שגיאה");
  }

  return (
    <section>
      <h1>ניהול הסכמות</h1>
      <p>תיעוד double opt-in: כל הסכמה מתועדת עם זמן, IP ו-User Agent. בכל עת ניתן להסיר אותה.</p>

      <form onSubmit={(e) => e.preventDefault()}>
        <label>
          אימייל
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          ערוץ
          <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          מטרה
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={optIn}>הצטרף לערוץ</button>
          <button type="button" className="danger" onClick={optOut}>הסר הסכמה</button>
        </div>
        {msg && <div className="alert">{msg}</div>}
      </form>
    </section>
  );
}
