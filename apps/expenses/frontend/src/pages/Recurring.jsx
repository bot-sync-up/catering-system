import { useEffect, useState } from 'react';
import { recurring, coa } from '../api/client';
import { fmtMoney, fmtDate } from '../utils/format';

const CATEGORIES = [
  ['RENT', 'שכירות'], ['ELECTRICITY', 'חשמל'], ['WATER', 'מים'], ['GAS', 'גז'],
  ['INTERNET', 'אינטרנט'], ['CLEANING', 'ניקיון'], ['INSURANCE', 'ביטוחים'],
  ['PHONE', 'טלפון'], ['ACCOUNTING', 'הנה"ח'], ['SALARY', 'שכר'], ['OTHER', 'אחר'],
];

export default function Recurring() {
  const [list, setList] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank());

  function blank() {
    return {
      name: '', category: 'RENT', amount: '', frequency: 'MONTHLY',
      dayOfMonth: 1, startDate: new Date().toISOString().slice(0, 10),
      endDate: '', coaId: '', isActive: true, autoCreate: true,
    };
  }

  const refresh = () => recurring.list().then((r) => setList(r.data));
  useEffect(() => {
    refresh();
    coa.flat().then((r) => setAccounts(r.data.filter((c) => c.type === 'EXPENSE')));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await recurring.create({
      ...form,
      amount: Number(form.amount),
      dayOfMonth: Number(form.dayOfMonth),
      endDate: form.endDate || null,
    });
    setForm(blank());
    setShow(false);
    refresh();
  };

  const generateNow = async () => {
    const d = new Date();
    const r = await recurring.generate(d.getFullYear(), d.getMonth() + 1);
    alert(`נוצרו ${r.data.generated} הוצאות לחודש ${r.data.period}`);
    refresh();
  };

  const toggle = async (item) => {
    await recurring.update(item.id, { isActive: !item.isActive });
    refresh();
  };

  const remove = async (id) => {
    if (!confirm('למחוק?')) return;
    await recurring.remove(id);
    refresh();
  };

  return (
    <>
      <h1 className="page-title">הוצאות קבועות</h1>

      <div className="toolbar">
        <button className="btn" onClick={() => setShow(!show)}>{show ? 'סגור' : '+ הוצאה קבועה'}</button>
        <button className="btn secondary" onClick={generateNow}>צור הוצאות לחודש הנוכחי</button>
      </div>

      {show && (
        <div className="card">
          <h2>הוצאה קבועה חדשה</h2>
          <form onSubmit={submit}>
            <div className="form-row">
              <div>
                <label>שם</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label>קטגוריה</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label>סכום</label>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div>
                <label>תדירות</label>
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                  <option value="MONTHLY">חודשי</option>
                  <option value="QUARTERLY">רבעוני</option>
                  <option value="YEARLY">שנתי</option>
                  <option value="WEEKLY">שבועי</option>
                </select>
              </div>
              <div>
                <label>יום בחודש</label>
                <input type="number" min="1" max="28" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} />
              </div>
              <div>
                <label>תאריך התחלה</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <label>תאריך סיום (אופציונלי)</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div>
                <label>חשבון</label>
                <select value={form.coaId} onChange={(e) => setForm({ ...form, coaId: e.target.value })} required>
                  <option value="">בחר חשבון…</option>
                  {accounts.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.nameHe}</option>)}
                </select>
              </div>
            </div>
            <button className="btn success" type="submit">שמור</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>פעילות ({list.length})</h2>
        <table>
          <thead>
            <tr>
              <th>שם</th>
              <th>קטגוריה</th>
              <th>סכום</th>
              <th>תדירות</th>
              <th>יום</th>
              <th>החל מ-</th>
              <th>הופק לאחרונה</th>
              <th>נוצרו</th>
              <th>פעיל</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{CATEGORIES.find(([k]) => k === r.category)?.[1] || r.category}</td>
                <td className="amount">{fmtMoney(r.amount)}</td>
                <td>{r.frequency}</td>
                <td>{r.dayOfMonth}</td>
                <td>{fmtDate(r.startDate)}</td>
                <td>{r.lastGeneratedAt ? fmtDate(r.lastGeneratedAt) : '—'}</td>
                <td>{r._count?.expenses ?? 0}</td>
                <td>{r.isActive ? <span className="tag ok">פעיל</span> : <span className="tag bad">כבוי</span>}</td>
                <td>
                  <button className="btn small secondary" onClick={() => toggle(r)}>
                    {r.isActive ? 'כבה' : 'הפעל'}
                  </button>
                  <button className="btn small danger" style={{ marginRight: 4 }} onClick={() => remove(r.id)}>מחק</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
