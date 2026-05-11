import { useEffect, useState } from 'react';
import { expenses, coa, ocr } from '../api/client';
import { fmtMoney, fmtDate } from '../utils/format';

export default function Expenses() {
  const [list, setList] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);

  function emptyForm() {
    return {
      amount: '',
      vatAmount: '',
      description: '',
      expenseDate: new Date().toISOString().slice(0, 10),
      invoiceNumber: '',
      coaId: '',
      vendorId: '',
    };
  }

  const refresh = () => expenses.list().then((r) => setList(r.data));

  useEffect(() => {
    refresh();
    coa.flat().then((r) => setAccounts(r.data.filter((c) => c.type === 'EXPENSE')));
    expenses.vendors().then((r) => setVendors(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('payload', JSON.stringify({
      ...form,
      amount: Number(form.amount),
      vatAmount: form.vatAmount ? Number(form.vatAmount) : undefined,
    }));
    if (file) fd.append('invoice', file);
    await expenses.create(fd);
    setForm(emptyForm());
    setFile(null);
    setShowForm(false);
    refresh();
  };

  const doOcr = async () => {
    if (!file) return;
    setOcrBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await ocr.parse(fd);
      const f = data.fields || {};
      setForm((s) => ({
        ...s,
        amount: f.totalAmount ?? s.amount,
        vatAmount: f.vatAmount ?? s.vatAmount,
        invoiceNumber: f.invoiceNumber ?? s.invoiceNumber,
      }));
    } catch (e) {
      alert('שגיאת OCR: ' + (e.response?.data?.message || e.message));
    } finally {
      setOcrBusy(false);
    }
  };

  return (
    <>
      <h1 className="page-title">הוצאות</h1>

      <div className="toolbar">
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'סגור' : '+ הוצאה חדשה'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>הוצאה חדשה</h2>
          <form onSubmit={submit}>
            <div className="form-row">
              <div>
                <label>תיאור</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div>
                <label>תאריך</label>
                <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required />
              </div>
              <div>
                <label>מספר חשבונית</label>
                <input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div>
                <label>סכום (כולל מע"מ)</label>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label>מע"מ</label>
                <input type="number" step="0.01" value={form.vatAmount} onChange={(e) => setForm({ ...form, vatAmount: e.target.value })} />
              </div>
              <div>
                <label>חשבון</label>
                <select value={form.coaId} onChange={(e) => setForm({ ...form, coaId: e.target.value })} required>
                  <option value="">בחר חשבון…</option>
                  {accounts.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.nameHe}</option>))}
                </select>
              </div>
              <div>
                <label>ספק</label>
                <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
                  <option value="">—</option>
                  {vendors.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div>
                <label>חשבונית / קבלה (PDF/תמונה)</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept="image/*,application/pdf" />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="button" className="btn secondary" onClick={doOcr} disabled={!file || ocrBusy}>
                  {ocrBusy ? 'מעבד OCR…' : 'חלץ נתונים מהקובץ (OCR)'}
                </button>
              </div>
            </div>
            <button className="btn success" type="submit">שמור</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>רשימת הוצאות ({list.length})</h2>
        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>תיאור</th>
              <th>חשבון</th>
              <th>ספק</th>
              <th>סכום</th>
              <th>מקור</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td>{fmtDate(e.expenseDate)}</td>
                <td>{e.description}</td>
                <td>{e.coa?.code} {e.coa?.nameHe}</td>
                <td>{e.vendor?.name || '—'}</td>
                <td className="amount neg">{fmtMoney(e.amount)}</td>
                <td><span className="tag neutral">{sourceLabel(e.source)}</span></td>
                <td>
                  {e.status === 'RECONCILED' && <span className="tag ok">מותאם</span>}
                  {e.status === 'RECORDED' && <span className="tag neutral">נרשם</span>}
                  {e.status === 'PAID' && <span className="tag ok">שולם</span>}
                  {e.status === 'CANCELLED' && <span className="tag bad">בוטל</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function sourceLabel(s) {
  return ({
    MANUAL: 'ידני',
    RECURRING: 'קבוע',
    OCR: 'OCR',
    BANK_IMPORT: 'בנק',
    PETTY_CASH: 'קופה קטנה',
    REIMBURSEMENT: 'החזר',
  }[s]) || s;
}
