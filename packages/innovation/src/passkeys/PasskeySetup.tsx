/**
 * PasskeySetup — קומפוננטת UI עברית להגדרת Passkey ראשון למשתמש.
 *
 * הקומפוננטה מטפלת בשני שלבי ה-WebAuthn מצד הלקוח (`startRegistration` של
 * `@simplewebauthn/browser`), בעוד שהשרת אחראי על options + verify.
 */

import * as React from "react";
import { startRegistration } from "@simplewebauthn/browser";

export interface PasskeySetupProps {
  /** מבקש מהשרת אופציות רישום. */
  fetchOptions: () => Promise<unknown>;
  /** שולח את התגובה לאימות בשרת. מחזיר קודי שחזור אם הוקצו. */
  submitRegistration: (response: unknown, label: string) => Promise<{ recoveryCodes?: string[] }>;
  onComplete?: (recoveryCodes?: string[]) => void;
}

export const PasskeySetup: React.FC<PasskeySetupProps> = ({
  fetchOptions,
  submitRegistration,
  onComplete,
}) => {
  const [label, setLabel] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "creating" | "saving" | "done" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [codes, setCodes] = React.useState<string[] | null>(null);

  const handleClick = async () => {
    setStatus("creating");
    setError(null);
    try {
      const options = (await fetchOptions()) as Parameters<typeof startRegistration>[0];
      const response = await startRegistration(options);
      setStatus("saving");
      const { recoveryCodes } = await submitRegistration(response, label.trim() || "מכשיר ללא שם");
      setStatus("done");
      setCodes(recoveryCodes ?? null);
      onComplete?.(recoveryCodes);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "שגיאה לא ידועה");
    }
  };

  return (
    <div dir="rtl" style={{ maxWidth: 480, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ marginBottom: 8 }}>הגדרת Passkey</h2>
      <p style={{ color: "#444", lineHeight: 1.5 }}>
        Passkey מחליף סיסמה. שימו זרת על חיישן הטביעה, או הסתכלו במצלמה — וזהו.
        ההתחברות הבאה תהיה תוך שנייה.
      </p>

      <label style={{ display: "block", marginTop: 16 }}>
        <span style={{ fontWeight: 600 }}>שם למכשיר (לזיהוי):</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="למשל: אייפון של דוד"
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4, borderRadius: 6, border: "1px solid #ccc" }}
        />
      </label>

      <button
        onClick={handleClick}
        disabled={status === "creating" || status === "saving"}
        style={{
          marginTop: 16,
          padding: "10px 18px",
          background: "#0d6efd",
          color: "white",
          border: 0,
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        {status === "creating" && "ממתין למכשיר..."}
        {status === "saving" && "שומר..."}
        {(status === "idle" || status === "error") && "הוסף Passkey"}
        {status === "done" && "נוצר בהצלחה"}
      </button>

      {error && (
        <div style={{ marginTop: 12, padding: 10, background: "#fee", color: "#900", borderRadius: 6 }}>
          {error}
        </div>
      )}

      {codes && (
        <div style={{ marginTop: 20, padding: 12, background: "#f7f7f7", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>קודי שחזור — שמרו במקום בטוח</h3>
          <p style={{ color: "#555" }}>
            במידה ותאבדו את המכשיר, תוכלו להיכנס עם אחד מהקודים הבאים. כל קוד תקף לפעם אחת בלבד.
          </p>
          <ol style={{ fontFamily: "monospace", fontSize: 16 }}>
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
