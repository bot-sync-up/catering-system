import { useEffect, useState } from 'react';
import { petty, coa } from '../api/client';
import { fmtMoney, fmtDate } from '../utils/format';

export default function PettyCash() {
  const [boxes, setBoxes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(blank());
  const [file, setFile] = useState(null);
  const [showBox, setShowBox] = useState(false);
  const [boxForm, setBoxForm] = useState({ name: '', initialBalance: '' });

  function blank() {
    return { type: 'OUT', amount: '', description: '', date: new Date().toISOString().slice(0, 10), coaId: '' };
  }

  useEffect(() => {
    petty.list().then((r) => {
      setBoxes(r.data);
      if (r.data.length && !selected) setSelected(r.data[0].id);
    });
    coa.flat().then((r) => setAccounts(r.data.filter((c) => c.type === 'EXPENSE')));
  }, []);

  useEffect(() => {
    if (selected) petty.entries(selected).then((r) => setEntries(r.data));
  }, [selected]);

  const refresh = () => {
    petty.list().then((r) => setBoxes(r.data));
    if (selected) petty.entries(selected).then((r) => setEntries(r.data));
  };

  const addBox = async (e) => {
    e.preventDefault();
    const r = await petty.create({ name: boxForm.name, initialBalance: Number(boxForm.initialBalance) });
    setBoxForm({ name: '', initialBalance: '' });
    setShowBox(false);
    setSelected(r.data.id);
    refresh();
  };

  const addEntry = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('payload', JSON.stringify({ ...form, amount: Number(form.amount) }));
    if (file) fd.append('receipt', file);
    await petty.addEntry(selected, fd);
    setForm(blank());
    setFile(null);
    refresh();
  };

  const box = boxes.find((b) => b.id === selected);

  return (
    <>
      <h1 className="page-title">קופה קטנה</h1>

      <div className="toolbar">
        <div>
          <label>בחר קופה</label>
          <select value={selected || ''} onChange={(e) => setSelected(e.target.value)}>
            {boxes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <button className="btn" onClick={() => setShowBox(!showBox)}>{showBox ? 'סגור' : '+ קופה חדשה'}</button>
      </div>

      {showBox && (
        <div className="card">
          <form onSubmit={addBox}>
            <div className="form-row">
              <div>
                <label>שם קופה</label>
                <input value={boxForm.name} onChange={(e) => setBoxForm({ ...boxForm, name: e.target.value })} required />
              </div>
              <div>
                <label>יתרה התחלתית</label>
                <input type="number" step="0.01" value={boxForm.initialBalance} onChange={(e) => setBoxForm({ ...boxForm, initialBalance: e.target.value })} required />
              </div>
            </div>
            <button className="btn success">צור</button>
          </form>
        </div>
      )}

      {box && (
        <>
          <div className="kpi-grid">
            <div className="kpi">
              <div className="label">יתרה נוכחית</div>
              <div className="value">{fmtMoney(box.currentBalance)}</div>
            </div>
            <div className="kpi">
              <div className="label">יתרה התחלתית</div>
              <div className="value">{fmtMoney(box.initialBalance)}</div>
            </div>
          </div>

          <div className="card">
            <h2>תנועה חדשה</h2>
            <form onSubmit={addEntry}>
              <div className="form-row">
                <div>
                  <label>סוג</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="OUT">הוצאה (OUT)</option>
                    <option value="IN">חידוש (IN)</option>
                  </select>
                </div>
                <div>
                  <label>סכום</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div>
                  <label>תאריך</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label>חשבון (להוצאות)</label>
                  <select value={form.coaId} onChange={(e) => setForm({ ...form, coaId: e.target.value })}>
                    <option value="">—</option>
                    {accounts.map((c) => <option key={c.id} value={c.id}>{c.code} {c.nameHe}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label>תיאור</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div>
                  <label>קבלה (OCR אוטומטי)</label>
                  <input type="file" onChange={(e) => setFile(e.target.files[0])} accept="image/*,application/pdf" />
                </div>
              </div>
              <button className="btn success">הוסף</button>
            </form>
          </div>

          <div className="card">
            <h2>תנועות ({entries.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>סוג</th>
                  <th>תיאור</th>
                  <th>חשבון</th>
                  <th>סכום</th>
                  <th>קבלה</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.date)}</td>
                    <td>{e.type === 'OUT' ? 'הוצאה' : 'חידוש'}</td>
                    <td>{e.description}</td>
                    <td>{e.coa ? `${e.coa.code} ${e.coa.nameHe}` : '—'}</td>
                    <td className={`amount ${e.type === 'OUT' ? 'neg' : 'pos'}`}>{fmtMoney(e.amount)}</td>
                    <td>{e.receiptUrl ? <a href={e.receiptUrl} target="_blank">קובץ</a> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
