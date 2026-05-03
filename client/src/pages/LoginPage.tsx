import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startAuthentication } from "@simplewebauthn/browser";
import { api } from "../services/api";
import { useAuthStore } from "../services/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const setAuth = useAuthStore(s => s.setAuth);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth(data.token, data.user);
      nav("/schedule");
    } catch (e: any) {
      setErr(e.response?.data?.error || "שגיאת כניסה");
    }
  };

  const biometricLogin = async () => {
    setErr("");
    try {
      const { data } = await api.post("/auth/webauthn/login-options", { email });
      const asseResp = await startAuthentication(data.options);
      const { data: out } = await api.post("/auth/webauthn/login-verify", {
        userId: data.userId,
        response: asseResp,
      });
      setAuth(out.token, out.user);
      nav("/schedule");
    } catch (e: any) {
      setErr(e.response?.data?.error || "אימות ביומטרי נכשל");
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <form onSubmit={submit} className="card" style={{ width: 360 }}>
        <h2 style={{ marginTop: 0 }}>כניסה למערכת HR</h2>
        {err && <div style={{ color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
        <label className="label">אימייל</label>
        <input className="input" value={email} onChange={e => setEmail(e.target.value)} required />
        <div style={{ height: 12 }} />
        <label className="label">סיסמה</label>
        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <div style={{ height: 16 }} />
        <button className="btn" type="submit" style={{ width: "100%" }}>כניסה</button>
        <div style={{ height: 8 }} />
        <button className="btn secondary" type="button" style={{ width: "100%" }} onClick={biometricLogin}>
          כניסה ביומטרית (Face ID / טביעת אצבע)
        </button>
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
          דמו: admin@hr.local / admin1234
        </p>
      </form>
    </div>
  );
}
