import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchAuditLogs,
  exportCsvUrl,
  exportPdfUrl,
  type AuditRow,
  type AuditQuery,
} from '../api/auditClient';

const ACTIONS = [
  '', 'CREATE', 'UPDATE', 'DELETE', 'READ_SENSITIVE',
  'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGE',
  'ROLE_CHANGE', 'OFFICIAL_TAG_CHANGE', 'EXPORT', 'PERMISSION_DENIED',
];

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'יצירה',
  UPDATE: 'עדכון',
  DELETE: 'מחיקה',
  READ_SENSITIVE: 'צפייה בנתון רגיש',
  LOGIN_SUCCESS: 'כניסה הצליחה',
  LOGIN_FAILURE: 'כניסה נכשלה',
  LOGOUT: 'יציאה',
  PASSWORD_CHANGE: 'שינוי סיסמה',
  ROLE_CHANGE: 'שינוי תפקיד',
  OFFICIAL_TAG_CHANGE: 'שינוי תיוג רשמי',
  EXPORT: 'יצוא',
  PERMISSION_DENIED: 'נדחתה הרשאה',
};

export function AuditLogPage(): JSX.Element {
  const [filters, setFilters] = useState<AuditQuery>({ page: 1, pageSize: 50, sort: 'desc' });
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / (filters.pageSize ?? 50))),
    [total, filters.pageSize],
  );

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchAuditLogs(filters);
      setRows(r.rows);
      setTotal(r.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof AuditQuery>(key: K, value: AuditQuery[K]): void {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  function setPage(page: number): void {
    setFilters((f) => ({ ...f, page }));
    setTimeout(() => void load(), 0);
  }

  return (
    <div>
      <header>
        <h1>יומן ביקורת — מערכת "ענה את השואל"</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          תוצאות: {total.toLocaleString('he-IL')}
        </span>
      </header>
      <main>
        <div className="filters">
          <div>
            <label htmlFor="q">חיפוש חופשי</label>
            <input
              id="q"
              placeholder="טקסט / IP / סוג ישות"
              value={filters.q ?? ''}
              onChange={(e) => update('q', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="action">סוג פעולה</label>
            <select
              id="action"
              value={filters.action ?? ''}
              onChange={(e) => update('action', e.target.value || undefined)}
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a === '' ? 'הכל' : ACTION_LABELS[a] ?? a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="entityType">סוג ישות</label>
            <input
              id="entityType"
              placeholder="Question / Answer / User / Auth"
              value={filters.entityType ?? ''}
              onChange={(e) => update('entityType', e.target.value || undefined)}
            />
          </div>
          <div>
            <label htmlFor="entityId">מזהה ישות</label>
            <input
              id="entityId"
              value={filters.entityId ?? ''}
              onChange={(e) => update('entityId', e.target.value || undefined)}
            />
          </div>
          <div>
            <label htmlFor="userId">מזהה משתמש</label>
            <input
              id="userId"
              value={filters.userId ?? ''}
              onChange={(e) => update('userId', e.target.value || undefined)}
            />
          </div>
          <div>
            <label htmlFor="ip">כתובת IP</label>
            <input
              id="ip"
              value={filters.ip ?? ''}
              onChange={(e) => update('ip', e.target.value || undefined)}
            />
          </div>
          <div>
            <label htmlFor="from">מתאריך</label>
            <input
              id="from"
              type="datetime-local"
              value={filters.from ?? ''}
              onChange={(e) => update('from', e.target.value || undefined)}
            />
          </div>
          <div>
            <label htmlFor="to">עד תאריך</label>
            <input
              id="to"
              type="datetime-local"
              value={filters.to ?? ''}
              onChange={(e) => update('to', e.target.value || undefined)}
            />
          </div>
          <div className="actions">
            <button onClick={() => void load()} disabled={loading}>
              {loading ? 'טוען...' : 'חיפוש'}
            </button>
            <a href={exportCsvUrl(filters)}>
              <button className="secondary" type="button">יצוא CSV</button>
            </a>
            <a href={exportPdfUrl(filters)}>
              <button className="secondary" type="button">יצוא PDF</button>
            </a>
          </div>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: 12 }}>שגיאה: {error}</div>}

        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>פעולה</th>
              <th>ישות</th>
              <th>משתמש</th>
              <th>IP</th>
              <th>ערכים קודמים → חדשים</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td dir="ltr" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(r.timestamp).toLocaleString('he-IL')}
                </td>
                <td>
                  <span className={`badge ${r.action.toLowerCase()}`}>
                    {ACTION_LABELS[r.action] ?? r.action}
                  </span>
                </td>
                <td>
                  {r.entityType}
                  {r.entityId && <small style={{ color: 'var(--muted)' }}> #{r.entityId}</small>}
                </td>
                <td dir="ltr">{r.userId ?? '—'}</td>
                <td dir="ltr">{r.ip ?? '—'}</td>
                <td className="json-cell">
                  {(r.oldValues || r.newValues) && (
                    <details>
                      <summary>פירוט</summary>
                      <pre style={{ whiteSpace: 'pre-wrap' }}>
{`old: ${JSON.stringify(r.oldValues, null, 2)}
new: ${JSON.stringify(r.newValues, null, 2)}`}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                  לא נמצאו רשומות התואמות את הסינון
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="pager">
          <button
            className="secondary"
            onClick={() => setPage(Math.max(1, (filters.page ?? 1) - 1))}
            disabled={(filters.page ?? 1) <= 1}
          >
            הקודם
          </button>
          <span>
            עמוד {filters.page ?? 1} מתוך {totalPages}
          </span>
          <button
            className="secondary"
            onClick={() => setPage(Math.min(totalPages, (filters.page ?? 1) + 1))}
            disabled={(filters.page ?? 1) >= totalPages}
          >
            הבא
          </button>
        </div>
      </main>
    </div>
  );
}
