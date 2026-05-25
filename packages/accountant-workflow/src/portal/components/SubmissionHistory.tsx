/**
 * היסטוריית הגשות: שורות מתוך audit log.
 */
import * as React from 'react';

export interface HistoryEntry {
  timestamp: string;
  action: string;
  fileId?: string;
  reference?: string;
}

export interface SubmissionHistoryProps {
  entries: HistoryEntry[];
}

const ACTION_HE: Record<string, string> = {
  'file.generated': 'קובץ נוצר',
  'file.downloaded': 'קובץ הורד',
  'file.marked-submitted': 'סומן כהוגש',
  'file.confirmed': 'אושר ע"י הרשות',
  'config.mode-changed': 'שונה מצב דיווח',
  'portal.login': 'התחברות לפורטל',
};

export function SubmissionHistory(props: SubmissionHistoryProps): React.ReactElement {
  return (
    <div dir="rtl">
      <h2>היסטוריית הגשות</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={cell}>תאריך ושעה</th>
            <th style={cell}>פעולה</th>
            <th style={cell}>מזהה קובץ</th>
            <th style={cell}>מס' אסמכתא</th>
          </tr>
        </thead>
        <tbody>
          {props.entries.map((e, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={cell}>{new Date(e.timestamp).toLocaleString('he-IL')}</td>
              <td style={cell}>{ACTION_HE[e.action] ?? e.action}</td>
              <td style={cell}>{e.fileId?.slice(0, 8) ?? ''}</td>
              <td style={cell}>{e.reference ?? ''}</td>
            </tr>
          ))}
          {props.entries.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                אין רשומות
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const cell: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'right',
  borderBottom: '1px solid #eee',
};
