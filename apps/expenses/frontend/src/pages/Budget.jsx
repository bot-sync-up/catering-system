import { useEffect, useState } from 'react';
import { budget, coa } from '../api/client';
import { fmtMoney, fmtPct } from '../utils/format';

export default function Budget() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('');
  const [vsActual, setVsActual] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ year: new Date().getFullYear(), month: '', coaId: '', amount: '' });
  const [alerts, setAlerts] = useState([]);

  const refresh = () => {
    budget.vsActual(year, month || undefined).then((r) => setVsActual(r.data));
    budget.alerts({ year, acknowledged: false }).then((r) => setAlerts(r.data));
  };

  useEffect(() => {
    refresh();
    coa.flat().then((r) => setAccounts(r.data.filter((c) => c.type === 'EXPENSE')));
  }, [year, month]);

  const submit = async (e) => {
    e.preventDefault();
    await budget.upsert({
      year: Number(form.year),
      month: form.month ? Number(form.month) : null,
      coaId: form.coaId,
      amount: Number(form.amount),
    });
    setForm({ year, month: '', coaId: '', amount: '' });
    setShow(false);
    refresh();
  };

  const ackAlert = async (id) => {
    await budget.ackAlert(id);
    refresh();
  };

  return (
    <>
      <h1 className="page-title">תקציב מול ביצוע</h1>

      <div className="toolbar">
        <div>
          <label>שנה</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }} />
        </div>
        <div>
          <label>חודש (אופציונלי)</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">— שנתי —</option>
            {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
        <button className="btn" onClick={() => setShow(!show)}>{show ? 'סגור' : '+ הגדר תקציב'}</button>
      </div>

      {show && (
        <div className="card">
          <h2>תקציב חדש / עדכון</h2>
          <form onSubmit={submit}>
            <div className="form-row">
              <div>
                <label>שנה</label>
                <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
              </div>
              <div>
                <label>חודש (ריק = שנתי)</label>
                <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
                  <option value="">שנתי</option>
                  {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                </select>
              </div>
              <div>
                <label>חשבון</label>
                <select value={form.coaId} onChange={(e) => setForm({ ...form, coaId: e.target.value })} required>
                  <option value="">בחר…</option>
                  {accounts.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.nameHe}</option>)}
                </select>
              </div>
              <div>
                <label>סכום</label>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <button className="btn success">שמור</button>
          </form>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="card">
          <h2>התראות חריגה ({alerts.length})</h2>
          {alerts.map((a) => (
            <div key={a.id} className={`alert ${a.level === 'CRITICAL' ? 'error' : 'warn'}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{a.message}</strong>
                  <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>{a.month}/{a.year}</div>
                </div>
                <button className="btn small secondary" onClick={() => ackAlert(a.id)}>סמן כנקראה</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {vsActual && (
        <div className="card">
          <h2>תקציב מול ביצוע — {year}{month ? `/${month}` : ''}</h2>
          <table>
            <thead>
              <tr>
                <th>קוד</th>
                <th>חשבון</th>
                <th>תקציב</th>
                <th>בפועל</th>
                <th>סטייה</th>
                <th>%</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {vsActual.rows.map((r) => (
                <tr key={r.coaId}>
                  <td>{r.coaCode}</td>
                  <td>{r.coaName}</td>
                  <td className="amount">{fmtMoney(r.budget)}</td>
                  <td className="amount">{fmtMoney(r.actual)}</td>
                  <td className={`amount ${r.variance > 0 ? 'neg' : 'pos'}`}>{fmtMoney(r.variance)}</td>
                  <td>{fmtPct(r.variancePct)}</td>
                  <td>
                    {r.noBudget && <span className="tag warn">ללא תקציב</span>}
                    {!r.noBudget && r.overrun && <span className="tag bad">חריגה</span>}
                    {!r.noBudget && !r.overrun && <span className="tag ok">בתחום</span>}
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: '#f7fafc' }}>
                <td colSpan={2}>סה"כ</td>
                <td className="amount">{fmtMoney(vsActual.totals.budget)}</td>
                <td className="amount">{fmtMoney(vsActual.totals.actual)}</td>
                <td className={`amount ${vsActual.totals.variance > 0 ? 'neg' : 'pos'}`}>{fmtMoney(vsActual.totals.variance)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
