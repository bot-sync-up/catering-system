/**
 * AuditLogPage — דף Admin UI לחיפוש וצפייה ביומן הביקורת.
 *
 * מקבל פרופ `fetchPage` שמבצע את ה-API call בפועל — הפרדה זו
 * מאפשרת לצרכן לקרוא ל-tRPC, ל-REST, או ל-server action בלי תלות.
 *
 * הדף עצמו לא קורא ישירות ל-prisma — הוא קליינט בלבד.
 */
import * as React from 'react';
import type { AuditSearchQuery, AuditSearchResult } from '../search/query';

export interface AuditLogRowDisplay {
  id: string;
  createdAt: string | Date;
  userId: string | null;
  role: string | null;
  model: string;
  action: string;
  recordId: string | null;
  ip: string | null;
  channel: string;
  oldValues: unknown;
  newValues: unknown;
  hash: string;
}

export interface AuditLogPageProps {
  fetchPage: (query: AuditSearchQuery) => Promise<AuditSearchResult<AuditLogRowDisplay>>;
  /** האם המשתמש הוא GENERAL_ADMIN — מאפשר לראות את שדה ה-tenant */
  isGeneralAdmin?: boolean;
  /** callback לייצוא CSV (נקרא עם הסינון הנוכחי) */
  onExportCsv?: (query: AuditSearchQuery) => void;
  /** callback לייצוא PDF */
  onExportPdf?: (query: AuditSearchQuery) => void;
}

export function AuditLogPage(props: AuditLogPageProps): JSX.Element {
  const [filters, setFilters] = React.useState<AuditSearchQuery>({ page: 1, pageSize: 50 });
  const [result, setResult] = React.useState<AuditSearchResult<AuditLogRowDisplay> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<AuditLogRowDisplay | null>(null);

  const load = React.useCallback(
    async (q: AuditSearchQuery) => {
      setLoading(true);
      try {
        const r = await props.fetchPage(q);
        setResult(r);
      } finally {
        setLoading(false);
      }
    },
    [props],
  );

  React.useEffect(() => {
    void load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    void load(next);
  };

  return (
    <div dir="rtl" style={{ fontFamily: 'Heebo, sans-serif', padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>יומן ביקורת</h1>

      <form onSubmit={submit} style={filterStyle}>
        <input
          placeholder="מזהה משתמש"
          value={filters.userId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value || undefined }))}
        />
        <input
          placeholder="מודל (Answer, User...)"
          value={filters.model ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value || undefined }))}
        />
        <input
          placeholder="פעולה"
          value={filters.action ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value || undefined }))}
        />
        <input
          placeholder="מזהה רשומה"
          value={filters.recordId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, recordId: e.target.value || undefined }))}
        />
        <input
          type="date"
          value={dateInput(filters.from)}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value ? new Date(e.target.value) : undefined }))}
        />
        <input
          type="date"
          value={dateInput(filters.to)}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value ? new Date(e.target.value) : undefined }))}
        />
        <input
          placeholder="חיפוש טקסט"
          value={filters.text ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, text: e.target.value || undefined }))}
        />
        {props.isGeneralAdmin && (
          <input
            placeholder="Tenant ID"
            value={filters.tenantId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, tenantId: e.target.value || undefined }))}
          />
        )}
        <button type="submit">חפש</button>
        {props.onExportCsv && (
          <button type="button" onClick={() => props.onExportCsv!(filters)}>
            ייצוא CSV
          </button>
        )}
        {props.onExportPdf && (
          <button type="button" onClick={() => props.onExportPdf!(filters)}>
            ייצוא PDF
          </button>
        )}
      </form>

      {loading && <p>טוען...</p>}

      {result && (
        <>
          <p style={{ margin: '8px 0' }}>
            סה"כ: {result.total.toLocaleString('he-IL')} | עמוד {result.page}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f3f3f3' }}>
                <th style={th}>תאריך</th>
                <th style={th}>משתמש</th>
                <th style={th}>תפקיד</th>
                <th style={th}>מודל</th>
                <th style={th}>פעולה</th>
                <th style={th}>מזהה</th>
                <th style={th}>IP</th>
                <th style={th}>ערוץ</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{formatDate(row.createdAt)}</td>
                  <td style={td}>{row.userId ?? '-'}</td>
                  <td style={td}>{row.role ?? '-'}</td>
                  <td style={td}>{row.model}</td>
                  <td style={td}>{row.action}</td>
                  <td style={td}>{row.recordId ?? '-'}</td>
                  <td style={td}>{row.ip ?? '-'}</td>
                  <td style={td}>{row.channel}</td>
                  <td style={td}>
                    <button onClick={() => setSelected(row)}>פרטים</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            onChange={(p) => {
              const next = { ...filters, page: p };
              setFilters(next);
              void load(next);
            }}
          />
        </>
      )}

      {selected && <Drilldown row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Drilldown(props: { row: AuditLogRowDisplay; onClose: () => void }): JSX.Element {
  const { row } = props;
  return (
    <div style={overlay} onClick={props.onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h2>פרטי רשומה</h2>
        <p>
          <b>תאריך:</b> {formatDate(row.createdAt)}
        </p>
        <p>
          <b>משתמש:</b> {row.userId ?? '-'} ({row.role ?? '-'})
        </p>
        <p>
          <b>מודל / פעולה:</b> {row.model} / {row.action}
        </p>
        <p>
          <b>מזהה רשומה:</b> {row.recordId ?? '-'}
        </p>
        <p>
          <b>Hash:</b> <code style={{ fontSize: 11 }}>{row.hash}</code>
        </p>
        <details open>
          <summary>ערכים קודמים</summary>
          <pre style={pre}>{JSON.stringify(row.oldValues, null, 2)}</pre>
        </details>
        <details open>
          <summary>ערכים חדשים</summary>
          <pre style={pre}>{JSON.stringify(row.newValues, null, 2)}</pre>
        </details>
        <button onClick={props.onClose}>סגור</button>
      </div>
    </div>
  );
}

function Pagination(props: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize));
  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
      <button disabled={props.page <= 1} onClick={() => props.onChange(props.page - 1)}>
        הקודם
      </button>
      <span>
        {props.page} / {totalPages}
      </span>
      <button disabled={props.page >= totalPages} onClick={() => props.onChange(props.page + 1)}>
        הבא
      </button>
    </div>
  );
}

function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('he-IL');
}

function dateInput(d?: Date): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

const filterStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 16,
};
const th: React.CSSProperties = { padding: 8, textAlign: 'right' };
const td: React.CSSProperties = { padding: 6, textAlign: 'right' };
const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};
const modal: React.CSSProperties = {
  background: 'white',
  padding: 24,
  borderRadius: 8,
  maxWidth: 720,
  maxHeight: '90vh',
  overflow: 'auto',
  direction: 'rtl',
};
const pre: React.CSSProperties = {
  background: '#f7f7f7',
  padding: 8,
  borderRadius: 4,
  fontSize: 12,
  overflow: 'auto',
  maxHeight: 200,
};
