// כניסה/יציאה ממשמרת + אימות ביומטרי (WebAuthn) + GPS
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { api } from "../services/api";
import { useAuthStore } from "../services/auth";
import { useState } from "react";

export default function ClockPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [status, setStatus] = useState("");

  const today = new Date();
  const start = new Date(today); start.setHours(0,0,0,0);
  const end   = new Date(today); end.setHours(23,59,59,999);

  const { data: shifts = [] } = useQuery({
    queryKey: ["my-shifts-today"],
    queryFn: async () => (await api.get("/shifts/week", {
      params: { from: start.toISOString(), to: end.toISOString() },
    })).data,
  });

  const myShifts = shifts.filter((s: any) => s.employeeId === user?.employeeId);

  const verifyBiometric = async (): Promise<boolean> => {
    try {
      const { data } = await api.post("/auth/webauthn/login-options", { email: user!.email });
      await startAuthentication(data.options);
      return true;
    } catch (e) {
      alert("אימות ביומטרי נכשל. ודא שהגדרת Face ID / טביעת אצבע.");
      return false;
    }
  };

  const getGPS = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });

  const clockIn = useMutation({
    mutationFn: async (shiftId: string) => {
      setStatus("מבצע אימות ביומטרי...");
      const ok = await verifyBiometric();
      if (!ok) throw new Error("biometric failed");
      const gps = await getGPS();
      setStatus("שולח...");
      return (await api.post(`/shifts/${shiftId}/clock-in`, {
        method: "BIOMETRIC",
        ...gps,
      })).data;
    },
    onSuccess: () => { setStatus("נכנסת בהצלחה!"); qc.invalidateQueries({ queryKey: ["my-shifts-today"] }); },
    onError: () => setStatus("שגיאה בכניסה"),
  });

  const clockOut = useMutation({
    mutationFn: async (shiftId: string) => {
      const ok = await verifyBiometric();
      if (!ok) throw new Error("biometric failed");
      const gps = await getGPS();
      return (await api.post(`/shifts/${shiftId}/clock-out`, {
        method: "BIOMETRIC", ...gps,
      })).data;
    },
    onSuccess: () => { setStatus("יצאת בהצלחה!"); qc.invalidateQueries({ queryKey: ["my-shifts-today"] }); },
  });

  const enrollBiometric = async () => {
    try {
      const { data: opts } = await api.post("/auth/webauthn/register-options", { userId: user!.id });
      const reg = await startRegistration(opts);
      await api.post("/auth/webauthn/register-verify", { userId: user!.id, response: reg });
      alert("אימות ביומטרי הוגדר בהצלחה!");
    } catch (e: any) {
      alert("שגיאה ברישום: " + (e.message || ""));
    }
  };

  return (
    <>
      <h2 className="page-title">כניסה / יציאה ממשמרת</h2>

      <div className="card">
        <button className="btn secondary" onClick={enrollBiometric}>
          הגדר אימות ביומטרי (Face ID / טביעת אצבע)
        </button>
        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
          האימות משתמש ב-WebAuthn ובחומרת המכשיר (TouchID / FaceID / Windows Hello). הנתונים הביומטריים נשארים על המכשיר.
        </p>
      </div>

      {status && <div className="card" style={{ background: "#dbeafe" }}>{status}</div>}

      <h3>המשמרות שלי היום ({today.toLocaleDateString("he-IL")})</h3>
      {myShifts.length === 0 && <div className="card">אין משמרות משובצות להיום</div>}
      {myShifts.map((s: any) => (
        <div key={s.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: 18 }}>{s.startTime} – {s.endTime}</strong>
            {s.role && <span className="badge info" style={{ marginRight: 8 }}>{s.role}</span>}
            {s.location && <div style={{ color: "var(--muted)", fontSize: 13 }}>{s.location}</div>}
            {s.attendance?.clockInAt && (
              <div style={{ marginTop: 4, fontSize: 13 }}>
                נכנסת ב: {new Date(s.attendance.clockInAt).toLocaleTimeString("he-IL")}
                {s.attendance?.clockOutAt && ` · יצאת ב: ${new Date(s.attendance.clockOutAt).toLocaleTimeString("he-IL")}`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!s.attendance?.clockInAt && (
              <button className="btn success" onClick={() => clockIn.mutate(s.id)}>כניסה</button>
            )}
            {s.attendance?.clockInAt && !s.attendance?.clockOutAt && (
              <button className="btn danger" onClick={() => clockOut.mutate(s.id)}>יציאה</button>
            )}
            {s.attendance?.clockOutAt && <span className="badge success">הסתיים</span>}
          </div>
        </div>
      ))}
    </>
  );
}
