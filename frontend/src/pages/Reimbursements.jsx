import { useEffect, useState } from 'react';
import { reimbursement, coa } from '../api/client';
import { fmtMoney, fmtDate } from '../utils/format';

const STATUS_TAGS = {
  PENDING: ['neutral', 'ממתין'],
  APPROVED: ['ok', 'אושר'],
  REJECTED: ['bad', 'נדחה'],
  PAID: ['ok', 'שולם'],
};

export default function Reimbursements() {
  const [list, setList] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank());
  const [file, setFile] = useState(null);
  const [user, setUser] = useState(null);

  function blank() {
    return { amount: '', description: '', expenseDate: new Date().toISOString().slice(0, 10), coaId: '' };
  }

  const refresh = () => reimbursement.list().then((r) => setList(r.data));

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('user'))); } catch { /* */ }
    refresh();
    coa.flat().then((r) => setAccounts(r.data.filter((c) => c.type === 'EXPENSE')));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('payload', JSON.stringify({ ...form, amount: Number(form.amount) }));
    if (file) fd.append('receipt', file);
    await reimbursement.create(fd);
    setForm(blank());
    setFile(null);
    setShow(false);
    refresh();
  };

  const isApprover = user && ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user.role);
  const isPayer = user && ['ADMIN', 'ACCOUNTANT'].includes(user.role);

  const approve = async (id) => { await reimbursement.approve(id); refresh(); };
  const reject = async (id) => {
    const reason = prompt('סיבת דחייה?');
    if (reason === null) return;
    await reimbursement.reject(id, reason);
    refresh();
  };
  const pay = async (id) => {
    if (!confirm('לאשר תשלום ולרשום הוצאה?')) return;
    await reimbursement.pay(id);
    refresh();
  };

  return (
    <>
      <h1 className="page-title">החזרי הוצאות</h1>

      <div className="toolbar">
        <button className="btn" onClick={() => setShow(!show)}>{show ? 'סגור' : '+ בקשת החזר'}</button>
      </div>

      {show && (
        <div className="card">
          <h2>בקשת החזר חדשה</h2>
          <form onSubmit={submit}>
            <div className="form-row">
              <div>
                <label>תיאור</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div>
                <label>תאריך הוצאה</label>
                <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required />
              </div>
              <div>
                <label>סכום</label>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label>חשבון</label>
                <select value={form.coaId} onChange={(e) => setForm({ ...form, coaId: e.target.value })} required>
                  <option value="">בחר…</option>
                  {accounts.map((c) => <option key={c.id} value={c.id}>{c.code} {c.nameHe}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div>
                <label>קבלה</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept="image/*,application/pdf" />
              </div>
            </div>
            <button className="btn success">שלח</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>בקשות החזר ({list.length})</h2>
        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>עובד</th>
              <th>תיאור</th>
              <th>חשבון</th>
              <th>סכום</th>
              <th>סטטוס</th>
              <th>קבלה</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const [tag, label] = STATUS_TAGS[r.status] || ['neutral', r.status];
              return (
                <tr key={r.id}>
                  <td>{fmtDate(r.expenseDate)}</td>
                  <td>{r.user?.name}</td>
                  <td>{r.description}</td>
                  <td>{r.coa?.code} {r.coa?.nameHe}</td>
                  <td className="amount">{fmtMoney(r.amount)}</td>
                  <td><span className={`tag ${tag}`}>{label}</span></td>
                  <td>{r.receiptUrl ? <a href={r.receiptUrl} target="_blank">קובץ</a> : '—'}</td>
                  <td>
                    {r.status === 'PENDING' && isApprover && (
                      <>
                        <button className="btn small success" onClick={() => approve(r.id)}>אישור</button>
                        <button className="btn small danger" style={{ marginRight: 4 }} onClick={() => reject(r.id)}>דחייה</button>
                      </>
                    )}
                    {r.status === 'APPROVED' && isPayer && (
                      <button className="btn small" onClick={() => pay(r.id)}>סמן כשולם</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
