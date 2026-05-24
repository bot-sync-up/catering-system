// הערכות רבעון/שנה + KPI + פידבק 360
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import SignaturePad from "../components/SignaturePad";

const CRITERIA = ["מקצועיות", "שיתוף פעולה", "אחריות", "יצירתיות", "תקשורת"];

export default function EvaluationsPage() {
  const [tab, setTab] = useState<"eval"|"kpi"|"360">("eval");
  return (
    <>
      <h2 className="page-title">הערכות עובדים</h2>
      <div className="tabs">
        <button className={`tab ${tab==="eval"?"active":""}`} onClick={() => setTab("eval")}>הערכת תקופה</button>
        <button className={`tab ${tab==="kpi"?"active":""}`}  onClick={() => setTab("kpi")}>KPI</button>
        <button className={`tab ${tab==="360"?"active":""}`}  onClick={() => setTab("360")}>פידבק 360°</button>
      </div>
      {tab === "eval" && <EvaluationTab />}
      {tab === "kpi"  && <KpiTab />}
      {tab === "360"  && <Feedback360Tab />}
    </>
  );
}

function useEmployees() {
  return useQuery({
    queryKey: ["employees-light"],
    queryFn: async () => (await api.get("/employees")).data,
  });
}

function EvaluationTab() {
  const qc = useQueryClient();
  const { data: emps = [] } = useEmployees();
  const [empId, setEmpId] = useState("");
  const [period, setPeriod] = useState<"QUARTERLY"|"ANNUAL">("QUARTERLY");
  const [periodLabel, setPeriodLabel] = useState("Q2-2026");
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(CRITERIA.map(c => [c, 5]))
  );
  const [comments, setComments] = useState("");
  const [sig, setSig] = useState("");

  const overall = Object.values(scores).reduce((a,b)=>a+b,0) / CRITERIA.length;

  const submit = useMutation({
    mutationFn: async () => (await api.post("/evaluations", {
      employeeId: empId, period, periodLabel,
      scores, overallScore: overall,
      comments, signedSvg: sig || undefined,
    })).data,
    onSuccess: () => {
      alert("נשמר!");
      setComments(""); setSig("");
      qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>הערכת עובד</h3>
      <div className="row">
        <div>
          <label className="label">עובד</label>
          <select className="select" value={empId} onChange={e=>setEmpId(e.target.value)}>
            <option value="">-- בחר --</option>
            {emps.map((e:any) => <option key={e.id} value={e.id}>{e.hebrewName||`${e.firstName} ${e.lastName}`}</option>)}
          </select>
        </div>
        <div>
          <label className="label">תקופה</label>
          <select className="select" value={period} onChange={e=>setPeriod(e.target.value as any)}>
            <option value="QUARTERLY">רבעון</option>
            <option value="ANNUAL">שנה</option>
          </select>
        </div>
      </div>
      <div className="row">
        <div>
          <label className="label">תווית תקופה</label>
          <input className="input" value={periodLabel} onChange={e=>setPeriodLabel(e.target.value)} placeholder="Q2-2026" />
        </div>
        <div></div>
      </div>

      <h4>ציונים (1-10)</h4>
      {CRITERIA.map(c => (
        <div key={c} className="row" style={{ marginBottom: 8, alignItems: "center" }}>
          <div style={{ fontWeight: 500 }}>{c}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="range" min={1} max={10} value={scores[c]}
              onChange={e => setScores({ ...scores, [c]: +e.target.value })} style={{ flex: 1 }} />
            <strong style={{ width: 30, textAlign: "center" }}>{scores[c]}</strong>
          </div>
        </div>
      ))}

      <div style={{ background: "#dbeafe", padding: 10, borderRadius: 8, marginTop: 10 }}>
        ציון כולל: <strong>{overall.toFixed(1)}</strong>
      </div>

      <label className="label" style={{ marginTop: 14 }}>הערות</label>
      <textarea className="input" rows={3} value={comments} onChange={e=>setComments(e.target.value)} />

      <div style={{ marginTop: 12 }}>
        {sig ? <img src={sig} style={{ maxWidth: 200, border: "1px solid #ccc" }} />
             : <SignaturePad onSign={setSig} />}
      </div>

      <button className="btn" style={{ marginTop: 14 }} disabled={!empId} onClick={() => submit.mutate()}>
        שמור הערכה
      </button>
    </div>
  );
}

function KpiTab() {
  const qc = useQueryClient();
  const { data: emps = [] } = useEmployees();
  const [empId, setEmpId] = useState("");
  const [form, setForm] = useState({ name: "", target: 0, actual: 0, unit: "%", period: "2026-Q2", weight: 1 });

  const { data: kpis = [] } = useQuery({
    queryKey: ["kpis", empId],
    queryFn: async () => empId ? (await api.get(`/evaluations/kpi/employee/${empId}`)).data : [],
    enabled: !!empId,
  });

  const add = useMutation({
    mutationFn: async () => (await api.post("/evaluations/kpi", { employeeId: empId, ...form })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kpis", empId] }),
  });

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>הוספת KPI</h3>
        <div className="row">
          <div>
            <label className="label">עובד</label>
            <select className="select" value={empId} onChange={e=>setEmpId(e.target.value)}>
              <option value="">-- בחר --</option>
              {emps.map((e:any) => <option key={e.id} value={e.id}>{e.hebrewName||`${e.firstName} ${e.lastName}`}</option>)}
            </select>
          </div>
          <div>
            <label className="label">תקופה</label>
            <input className="input" value={form.period} onChange={e=>setForm({...form, period: e.target.value})} />
          </div>
        </div>
        <div className="row">
          <div><label className="label">שם המדד</label>
            <input className="input" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="מכירות חודשיות" />
          </div>
          <div><label className="label">יחידה</label>
            <input className="input" value={form.unit} onChange={e=>setForm({...form, unit: e.target.value})} />
          </div>
        </div>
        <div className="row">
          <div><label className="label">יעד</label><input type="number" className="input" value={form.target} onChange={e=>setForm({...form, target: +e.target.value})} /></div>
          <div><label className="label">בפועל</label><input type="number" className="input" value={form.actual} onChange={e=>setForm({...form, actual: +e.target.value})} /></div>
        </div>
        <button className="btn" disabled={!empId || !form.name} onClick={() => add.mutate()}>הוסף KPI</button>
      </div>

      {empId && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>KPIs של העובד</h3>
          <table>
            <thead><tr><th>תקופה</th><th>מדד</th><th>יעד</th><th>בפועל</th><th>אחוז</th></tr></thead>
            <tbody>
              {kpis.map((k: any) => {
                const pct = k.target ? Math.round((k.actual / k.target) * 100) : 0;
                return (
                  <tr key={k.id}>
                    <td>{k.period}</td>
                    <td>{k.name}</td>
                    <td>{k.target} {k.unit}</td>
                    <td>{k.actual} {k.unit}</td>
                    <td>
                      <span className={`badge ${pct >= 100 ? "success" : pct >= 70 ? "warning" : "danger"}`}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Feedback360Tab() {
  const qc = useQueryClient();
  const { data: emps = [] } = useEmployees();
  const [receiverId, setReceiverId] = useState("");
  const [relation, setRelation] = useState("עמית");
  const [scores, setScores] = useState<Record<string, number>>({ תקשורת: 7, אחריות: 7, "שיתוף פעולה": 7 });
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const submit = useMutation({
    mutationFn: async () => (await api.post("/evaluations/feedback360", {
      receiverId, period: "2026-Q2", relation, scores, strengths, improvements, anonymous,
    })).data,
    onSuccess: () => {
      alert("נשלח!");
      setStrengths(""); setImprovements("");
      qc.invalidateQueries({ queryKey: ["fb360", receiverId] });
    },
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ["fb360", receiverId],
    queryFn: async () => receiverId ? (await api.get(`/evaluations/feedback360/employee/${receiverId}`)).data : [],
    enabled: !!receiverId,
  });

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>שלח פידבק 360°</h3>
        <div className="row">
          <div>
            <label className="label">מי מקבל</label>
            <select className="select" value={receiverId} onChange={e=>setReceiverId(e.target.value)}>
              <option value="">-- בחר --</option>
              {emps.map((e:any) => <option key={e.id} value={e.id}>{e.hebrewName||`${e.firstName} ${e.lastName}`}</option>)}
            </select>
          </div>
          <div>
            <label className="label">היחס שלך אליו</label>
            <select className="select" value={relation} onChange={e=>setRelation(e.target.value)}>
              <option>ממונה</option><option>עמית</option><option>כפיף</option><option>לקוח</option>
            </select>
          </div>
        </div>

        {Object.keys(scores).map(k => (
          <div key={k} className="row" style={{ marginBottom: 8, alignItems: "center" }}>
            <div>{k}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={1} max={10} value={scores[k]}
                onChange={e => setScores({ ...scores, [k]: +e.target.value })} style={{ flex: 1 }} />
              <strong>{scores[k]}</strong>
            </div>
          </div>
        ))}

        <label className="label">חוזקות</label>
        <textarea className="input" rows={2} value={strengths} onChange={e=>setStrengths(e.target.value)} />
        <label className="label" style={{ marginTop: 8 }}>נקודות לשיפור</label>
        <textarea className="input" rows={2} value={improvements} onChange={e=>setImprovements(e.target.value)} />

        <label style={{ display: "block", marginTop: 10 }}>
          <input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)} />
          {" "}שלח באופן אנונימי
        </label>

        <button className="btn" style={{ marginTop: 12 }} disabled={!receiverId} onClick={() => submit.mutate()}>
          שלח פידבק
        </button>
      </div>

      {receiverId && feedbacks.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>פידבקים שהתקבלו</h3>
          {feedbacks.map((f: any) => (
            <div key={f.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <div>
                <span className="badge info">{f.relation}</span>
                {f.anonymous && <span className="badge" style={{ background: "#e5e7eb", marginRight: 6 }}>אנונימי</span>}
              </div>
              {f.strengths   && <div><strong>חוזקות:</strong> {f.strengths}</div>}
              {f.improvements && <div><strong>שיפור:</strong> {f.improvements}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
