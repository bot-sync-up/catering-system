/**
 * רשימת קבצים: pending / downloaded / submitted / confirmed.
 * Checkbox "סומן כהוגש" + שדה מספר אסמכתא.
 */
import * as React from 'react';
import type { GeneratedFile, AccountantRole, ReportStatus } from '../../types';

export interface FilesListProps {
  actor: AccountantRole;
  files: GeneratedFile[];
  onDownload: (fileId: string) => Promise<void>;
  onMarkSubmitted: (fileId: string, reference: string) => Promise<void>;
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: 'ממתין',
  downloaded: 'הורד',
  submitted: 'הוגש',
  confirmed: 'אושר',
};

const STATUS_COLOR: Record<ReportStatus, string> = {
  pending: '#999',
  downloaded: '#0078d4',
  submitted: '#5cb85c',
  confirmed: '#2c5f2d',
};

const FORM_LABEL: Record<GeneratedFile['formType'], string> = {
  PCN874: 'PCN874',
  FORM856: 'טופס 856',
  FORM856_PART_A: '856 חלק א\'',
  FORM856_PART_B: '856 חלק ב\'',
  FORM102: 'טופס 102',
  FORM126: 'טופס 126',
  INCOME_STATEMENT: 'רווח והפסד',
  BALANCE_SHEET: 'מאזן',
  JOURNAL_ENTRIES: 'יומן הח"ש',
};

export function FilesList(props: FilesListProps): React.ReactElement {
  const [refInputs, setRefInputs] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

  return (
    <table style={tableStyle}>
      <thead>
        <tr style={headerRowStyle}>
          <th>טופס</th>
          <th>תקופה</th>
          <th>סטטוס</th>
          <th>תאריך יצירה</th>
          <th>פעולות</th>
        </tr>
      </thead>
      <tbody>
        {props.files.map((file) => {
          const periodLabel = file.period.month
            ? `${file.period.year}/${String(file.period.month).padStart(2, '0')}`
            : String(file.period.year);
          return (
            <tr key={file.id} style={rowStyle}>
              <td>{FORM_LABEL[file.formType]}</td>
              <td>{periodLabel}</td>
              <td>
                <span style={{ ...statusStyle, background: STATUS_COLOR[file.status] }}>
                  {STATUS_LABEL[file.status]}
                  {file.submittedAt ? ` (${new Date(file.submittedAt).toLocaleDateString('he-IL')})` : ''}
                </span>
              </td>
              <td>{new Date(file.generatedAt).toLocaleDateString('he-IL')}</td>
              <td>
                <button
                  style={btnStyle}
                  disabled={busy === file.id}
                  onClick={async () => {
                    setBusy(file.id);
                    try {
                      await props.onDownload(file.id);
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  הורד
                </button>
                {file.status !== 'submitted' && file.status !== 'confirmed' && (
                  <>
                    <input
                      style={inputStyle}
                      placeholder="מס' אסמכתא"
                      value={refInputs[file.id] ?? file.submissionReference ?? ''}
                      onChange={(e) =>
                        setRefInputs((prev) => ({ ...prev, [file.id]: e.target.value }))
                      }
                    />
                    <button
                      style={{ ...btnStyle, background: '#5cb85c', color: '#fff' }}
                      disabled={busy === file.id || !(refInputs[file.id]?.trim())}
                      onClick={async () => {
                        const ref = refInputs[file.id]?.trim();
                        if (!ref) return;
                        setBusy(file.id);
                        try {
                          await props.onMarkSubmitted(file.id, ref);
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      סמן כהוגש
                    </button>
                  </>
                )}
              </td>
            </tr>
          );
        })}
        {props.files.length === 0 && (
          <tr>
            <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#888' }}>
              אין קבצים להצגה
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};
const headerRowStyle: React.CSSProperties = {
  background: '#f5f5f5',
  borderBottom: '2px solid #ddd',
  textAlign: 'right',
};
const rowStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
};
const statusStyle: React.CSSProperties = {
  color: '#fff',
  padding: '2px 8px',
  borderRadius: 10,
  fontSize: 12,
};
const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  margin: '0 4px',
  border: '1px solid #ccc',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
};
const inputStyle: React.CSSProperties = {
  padding: 4,
  margin: '0 4px',
  border: '1px solid #ccc',
  borderRadius: 4,
  width: 120,
  textAlign: 'right',
};
