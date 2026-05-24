import { useEffect, useState } from 'react';
import { bank, expenses } from '../api/client';
import { fmtMoney, fmtDate } from '../utils/format';

export default function Bank() {
  const [accounts, setAccounts] = useState([]);
  const [statements, setStatements] = useState([]);
  const [selectedStmt, setSelectedStmt] = useState(null);
  const [txs, setTxs] = useState([]);
  const [showAcct, setShowAcct] = useState(false);
  const [acctForm, setAcctForm] = useState({ bankName: '', accountNumber: '', branchCode: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadAcct, setUploadAcct] = useState('');
  const [unmatchedExpenses, setUnmatchedExpenses] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);

  const refresh = () => {
    bank.accounts().then((r) => setAccounts(r.data));
    bank.statements().then((r) => setStatements(r.data));
    expenses.list({ status: 'RECORDED' }).then((r) => setUnmatchedExpenses(r.data.filter((e) => !e.reconciled)));
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (selectedStmt) bank.transactions(selectedStmt).then((r) => setTxs(r.data));
  }, [selectedStmt]);

  const addAcct = async (e) => {
    e.preventDefault();
    await bank.createAccount(acctForm);
    setAcctForm({ bankName: '', accountNumber: '', branchCode: '' });
    setShowAcct(false);
    refresh();
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadAcct) return alert('נא לבחור חשבון וקובץ');
    const fd = new FormData();
    fd.append('bankAccountId', uploadAcct);
    fd.append('file', uploadFile);
    const { data } = await bank.upload(fd);
    setUploadResult(data.matching);
    setUploadFile(null);
    setSelectedStmt(data.statement.id);
    refresh();
  };

  const match = async (txId, expenseId) => {
    if (!expenseId) return;
    await bank.match(txId, expenseId);
    bank.transactions(selectedStmt).then((r) => setTxs(r.data));
    refresh();
  };

  const unmatch = async (txId) => {
    await bank.unmatch(txId);
    bank.transactions(selectedStmt).then((r) => setTxs(r.data));
    refresh();
  };

  return (
    <>
      <h1 className="page-title">בנק והתאמות</h1>

      <div className="toolbar">
        <button className="btn" onClick={() => setShowAcct(!showAcct)}>{showAcct ? 'סגור' : '+ חשבון בנק'}</button>
      </div>

      {showAcct && (
        <div className="card">
          <form onSubmit={addAcct}>
            <div className="form-row">
              <div>
                <label>שם בנק</label>
                <input value={acctForm.bankName} onChange={(e) => setAcctForm({ ...acctForm, bankName: e.target.value })} required />
              </div>
              <div>
                <label>סניף</label>
                <input value={acctForm.branchCode} onChange={(e) => setAcctForm({ ...acctForm, branchCode: e.target.value })} />
              </div>
              <div>
                <label>מספר חשבון</label>
                <input value={acctForm.accountNumber} onChange={(e) => setAcctForm({ ...acctForm, accountNumber: e.target.value })} required />
              </div>
            </div>
            <button className="btn success">צור</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>העלאת דף בנק (OFX / CSV / XLSX)</h2>
        <form onSubmit={upload}>
          <div className="form-row">
            <div>
              <label>חשבון בנק</label>
              <select value={uploadAcct} onChange={(e) => setUploadAcct(e.target.value)} required>
                <option value="">בחר…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber}</option>)}
              </select>
            </div>
            <div>
              <label>קובץ</label>
              <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} accept=".ofx,.csv,.xlsx,.xls" required />
            </div>
          </div>
          <button className="btn success">העלה ובצע התאמה אוטומטית</button>
        </form>
        {uploadResult && (
          <div className="alert info" style={{ marginTop: '0.75rem' }}>
            הותאמו אוטומטית: <strong>{uploadResult.autoMatched}</strong> מתוך {uploadResult.total} תנועות.
            הצעות להתאמה ידנית: <strong>{uploadResult.suggested}</strong>.
          </div>
        )}
      </div>

      <div className="card">
        <h2>דפי בנק</h2>
        <table>
          <thead>
            <tr><th>קובץ</th><th>סוג</th><th>טווח</th><th>תנועות</th><th>הועלה</th><th></th></tr>
          </thead>
          <tbody>
            {statements.map((s) => (
              <tr key={s.id}>
                <td>{s.filename}</td>
                <td>{s.fileType}</td>
                <td>{fmtDate(s.startDate)} – {fmtDate(s.endDate)}</td>
                <td>{s._count.transactions}</td>
                <td>{fmtDate(s.uploadedAt)}</td>
                <td><button className="btn small" onClick={() => setSelectedStmt(s.id)}>הצג</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedStmt && (
        <div className="card">
          <h2>תנועות בנק</h2>
          <table>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>תיאור</th>
                <th>סכום</th>
                <th>סטטוס</th>
                <th>שיוך</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.txDate)}</td>
                  <td>{t.description}</td>
                  <td className={`amount ${Number(t.amount) < 0 ? 'neg' : 'pos'}`}>{fmtMoney(t.amount)}</td>
                  <td>
                    {t.matched
                      ? <span className="tag ok">מותאם ({(t.matchScore * 100).toFixed(0)}%)</span>
                      : t.matchScore
                        ? <span className="tag warn">הצעה ({(t.matchScore * 100).toFixed(0)}%)</span>
                        : <span className="tag neutral">לא מותאם</span>}
                  </td>
                  <td>
                    {t.matched && t.expense ? (
                      <div>
                        {t.expense.description}
                        <button className="btn small danger" style={{ marginRight: 6 }} onClick={() => unmatch(t.id)}>נתק</button>
                      </div>
                    ) : (
                      <select onChange={(e) => match(t.id, e.target.value)} defaultValue="">
                        <option value="">בחר הוצאה להתאמה…</option>
                        {unmatchedExpenses
                          .filter((e) => Math.abs(Number(e.amount) - Math.abs(Number(t.amount))) < 0.5)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {fmtDate(e.expenseDate)} — {e.description} — {fmtMoney(e.amount)}
                            </option>
                          ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
