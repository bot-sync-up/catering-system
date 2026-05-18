// תיק עובד מלא: פרטים, תמונה, תעודות, 101/161 חתום, ביטוח, בנק/פנסיה, תאונות
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import SignaturePad from "../components/SignaturePad";

const DOC_LABEL: Record<string, string> = {
  ID_CARD: "תעודת זהות",
  PASSPORT: "דרכון",
  DRIVING_LICENSE: "רישיון נהיגה",
  HEALTH_CERT: "תעודת בריאות",
  FORM_101: "טופס 101",
  FORM_161: "טופס 161",
  INSURANCE: "ביטוח",
  CONTRACT: "הסכם עבודה",
  OTHER: "אחר",
};

export default function EmployeeFilePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"details"|"docs"|"bank"|"accidents">("details");

  const { data: emp, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => (await api.get(`/employees/${id}`)).data,
  });

  const { data: docs } = useQuery({
    queryKey: ["docs", id],
    queryFn: async () => (await api.get(`/employees/${id}/documents`)).data,
  });

  const { data: accidents } = useQuery({
    queryKey: ["accidents", id],
    queryFn: async () => (await api.get(`/employees/${id}/accidents`)).data,
  });

  const updateMut = useMutation({
    mutationFn: async (body: any) => (await api.put(`/employees/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee", id] }),
  });

  if (isLoading) return <div>טוען...</div>;
  if (!emp) return <div>לא נמצא</div>;

  return (
    <>
      <h2 className="page-title">
        תיק עובד · {emp.hebrewName || `${emp.firstName} ${emp.lastName}`}
      </h2>

      <div className="tabs">
        <button className={`tab ${tab==="details"?"active":""}`} onClick={() => setTab("details")}>פרטים אישיים</button>
        <button className={`tab ${tab==="docs"?"active":""}`}    onClick={() => setTab("docs")}>תעודות + חתימות</button>
        <button className={`tab ${tab==="bank"?"active":""}`}    onClick={() => setTab("bank")}>בנק / פנסיה</button>
        <button className={`tab ${tab==="accidents"?"active":""}`} onClick={() => setTab("accidents")}>תאונות עבודה</button>
      </div>

      {tab === "details" && <DetailsTab emp={emp} update={updateMut.mutate} />}
      {tab === "docs"    && <DocsTab employeeId={id!} docs={docs || []} />}
      {tab === "bank"    && <BankTab emp={emp} update={updateMut.mutate} />}
      {tab === "accidents" && <AccidentsTab employeeId={id!} accidents={accidents || []} />}
    </>
  );
}

function DetailsTab({ emp, update }: any) {
  const [form, setForm] = useState({
    firstName: emp.firstName,
    lastName: emp.lastName,
    hebrewName: emp.hebrewName || "",
    phone: emp.phone || "",
    address: emp.address || "",
    birthDate: emp.birthDate ? emp.birthDate.slice(0,10) : "",
    taxId: emp.taxId || "",
  });
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("photo", f);
    await api.post(`/employees/${emp.id}/photo`, fd);
    location.reload();
  };
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ textAlign: "center" }}>
          {emp.photoUrl
            ? <img src={emp.photoUrl} style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover" }} />
            : <div style={{ width: 120, height: 120, borderRadius: "50%", background: "#e5e7eb" }} />}
          <input type="file" accept="image/*" onChange={upload} style={{ marginTop: 10, fontSize: 12 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="row">
            <div><label className="label">שם פרטי</label><input className="input" value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} /></div>
            <div><label className="label">שם משפחה</label><input className="input" value={form.lastName}  onChange={e=>setForm({...form, lastName:e.target.value})} /></div>
          </div>
          <div className="row">
            <div><label className="label">שם בעברית</label><input className="input" value={form.hebrewName} onChange={e=>setForm({...form, hebrewName:e.target.value})} /></div>
            <div><label className="label">טלפון</label><input className="input" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} /></div>
          </div>
          <div className="row">
            <div><label className="label">כתובת</label><input className="input" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} /></div>
            <div><label className="label">תאריך לידה</label><input type="date" className="input" value={form.birthDate} onChange={e=>setForm({...form, birthDate:e.target.value})} /></div>
          </div>
          <div className="row">
            <div>
              <label className="label">ת.ז (מוצפן AES-256)</label>
              <input className="input" value={form.taxId} onChange={e=>setForm({...form, taxId:e.target.value})} placeholder="123456789" />
            </div>
            <div></div>
          </div>
          <button className="btn" onClick={() => update({
            ...form,
            birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
          })}>שמור פרטים</button>
        </div>
      </div>
    </div>
  );
}

function DocsTab({ employeeId, docs }: { employeeId: string; docs: any[] }) {
  const qc = useQueryClient();
  const [type, setType] = useState("ID_CARD");
  const [file, setFile] = useState<File|null>(null);
  const [signature, setSignature] = useState<string>("");
  const needsSignature = type === "FORM_101" || type === "FORM_161" || type === "CONTRACT";

  const upload = async () => {
    if (!file) return alert("בחר קובץ");
    if (needsSignature && !signature) return alert("נדרשת חתימה לטופס זה");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    if (signature) fd.append("signatureSvg", signature);
    await api.post(`/employees/${employeeId}/documents`, fd);
    setFile(null);
    setSignature("");
    qc.invalidateQueries({ queryKey: ["docs", employeeId] });
  };

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>העלאת תעודה</h3>
        <div className="row">
          <div>
            <label className="label">סוג</label>
            <select className="select" value={type} onChange={e=>setType(e.target.value)}>
              {Object.entries(DOC_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">קובץ (PDF/תמונה)</label>
            <input type="file" accept="application/pdf,image/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
          </div>
        </div>
        {needsSignature && (
          <div style={{ marginTop: 10 }}>
            {signature ? (
              <div>
                <img src={signature} style={{ maxWidth: 200, border: "1px solid #ccc" }} />
                <button className="btn secondary" onClick={() => setSignature("")} style={{ marginRight: 8 }}>בטל חתימה</button>
              </div>
            ) : (
              <SignaturePad onSign={setSignature} />
            )}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={upload}>העלה תעודה</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>תעודות שהועלו</h3>
        <table>
          <thead><tr><th>סוג</th><th>שם קובץ</th><th>חתימה</th><th>הועלה</th><th></th></tr></thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id}>
                <td>{DOC_LABEL[d.type] || d.type}</td>
                <td><a href={d.fileUrl} target="_blank">{d.fileName}</a></td>
                <td>{d.signatureSvg ? <span className="badge success">חתום</span> : "—"}</td>
                <td>{new Date(d.uploadedAt).toLocaleDateString("he-IL")}</td>
                <td><a href={d.fileUrl} target="_blank" className="btn secondary">צפה</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BankTab({ emp, update }: any) {
  const [form, setForm] = useState({
    bankName: emp.bank?.bankName || "",
    branch: emp.bank?.branch || "",
    account: emp.bank?.account || "",
    salary: emp.salary || "",
    pensionFund: emp.pensionFund || "",
  });
  return (
    <div className="card">
      <p style={{ background: "#fef3c7", padding: 10, borderRadius: 8, fontSize: 13 }}>
        השדות בעמוד זה מוצפנים בשרת ב-AES-256-GCM ברמת שדה ולא נחשפים ברשימה הציבורית.
      </p>
      <div className="row">
        <div><label className="label">שם הבנק</label><input className="input" value={form.bankName} onChange={e=>setForm({...form, bankName:e.target.value})} /></div>
        <div><label className="label">סניף</label><input className="input" value={form.branch} onChange={e=>setForm({...form, branch:e.target.value})} /></div>
      </div>
      <div className="row">
        <div><label className="label">מספר חשבון</label><input className="input" value={form.account} onChange={e=>setForm({...form, account:e.target.value})} /></div>
        <div><label className="label">שכר חודשי (₪)</label><input className="input" type="number" value={form.salary} onChange={e=>setForm({...form, salary:e.target.value})} /></div>
      </div>
      <div className="row">
        <div><label className="label">קופת פנסיה</label><input className="input" value={form.pensionFund} onChange={e=>setForm({...form, pensionFund:e.target.value})} /></div>
        <div></div>
      </div>
      <button className="btn" onClick={() => update({
        firstName: emp.firstName, lastName: emp.lastName,
        salary: form.salary,
        pensionFund: form.pensionFund,
        bank: { bankName: form.bankName, branch: form.branch, account: form.account },
      })}>שמור פרטי בנק/פנסיה (מוצפנים)</button>
    </div>
  );
}

const SEV: Record<string, string> = { MINOR: "קלה", MODERATE: "בינונית", SEVERE: "חמורה", FATAL: "קשה מאוד" };

function AccidentsTab({ employeeId, accidents }: { employeeId: string; accidents: any[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    occurredAt: new Date().toISOString().slice(0,16),
    location: "", description: "", severity: "MINOR" as const, daysOff: 0,
  });
  const [sig, setSig] = useState("");

  const submit = async () => {
    await api.post(`/employees/${employeeId}/accidents`, {
      ...form,
      occurredAt: new Date(form.occurredAt).toISOString(),
      signedSvg: sig || undefined,
    });
    setForm({ ...form, location: "", description: "" });
    setSig("");
    qc.invalidateQueries({ queryKey: ["accidents", employeeId] });
  };

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>דווח על תאונה חדשה</h3>
        <div className="row">
          <div><label className="label">מתי</label><input type="datetime-local" className="input" value={form.occurredAt} onChange={e=>setForm({...form, occurredAt: e.target.value})} /></div>
          <div><label className="label">מקום</label><input className="input" value={form.location} onChange={e=>setForm({...form, location: e.target.value})} /></div>
        </div>
        <label className="label">תיאור</label>
        <textarea className="input" rows={3} value={form.description} onChange={e=>setForm({...form, description: e.target.value})} />
        <div className="row" style={{ marginTop: 12 }}>
          <div><label className="label">חומרה</label>
            <select className="select" value={form.severity} onChange={e=>setForm({...form, severity: e.target.value as any})}>
              {Object.entries(SEV).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="label">ימי היעדרות</label>
            <input type="number" className="input" value={form.daysOff} onChange={e=>setForm({...form, daysOff: +e.target.value})} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          {sig ? <img src={sig} style={{ maxWidth: 200, border: "1px solid #ccc" }} /> : <SignaturePad onSign={setSig} />}
        </div>
        <button className="btn danger" style={{ marginTop: 14 }} onClick={submit}>שלח דיווח</button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>תאונות קודמות</h3>
        <table>
          <thead><tr><th>תאריך</th><th>מקום</th><th>חומרה</th><th>היעדרות</th><th>תיאור</th></tr></thead>
          <tbody>
            {accidents.map(a => (
              <tr key={a.id}>
                <td>{new Date(a.occurredAt).toLocaleDateString("he-IL")}</td>
                <td>{a.location}</td>
                <td><span className={`badge ${a.severity==="MINOR"?"info":a.severity==="MODERATE"?"warning":"danger"}`}>{SEV[a.severity]}</span></td>
                <td>{a.daysOff} ימים</td>
                <td>{a.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
