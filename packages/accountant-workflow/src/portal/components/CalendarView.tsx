/**
 * תצוגת יומן: מוצגים בה ה-15 לכל חודש (מע"מ) ו-15.7 (שנתי), עם
 * אינדיקציה לקבצים שלא הוגשו עד המועד.
 */
import * as React from 'react';
import type { GeneratedFile } from '../../types';
import { computeDeadline } from './AccountantDashboard';

export interface CalendarViewProps {
  files: GeneratedFile[];
  year?: number;
}

export function CalendarView(props: CalendarViewProps): React.ReactElement {
  const year = props.year ?? new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const today = new Date();

  return (
    <div dir="rtl">
      <h2 style={{ marginBottom: 16 }}>יומן הגשות {year}</h2>
      <div style={gridStyle}>
        {months.map((m) => {
          const deadline = new Date(year, m, 15); // 15 בחודש הבא
          const filesForMonth = props.files.filter(
            (f) => f.period.month === m && f.period.year === year,
          );
          const overdue = filesForMonth.some(
            (f) => f.status !== 'submitted' && f.status !== 'confirmed' && today > computeDeadline(f),
          );
          const allSubmitted =
            filesForMonth.length > 0 &&
            filesForMonth.every((f) => f.status === 'submitted' || f.status === 'confirmed');
          return (
            <div
              key={m}
              style={{
                ...cellStyle,
                borderColor: overdue ? '#d9534f' : allSubmitted ? '#5cb85c' : '#ccc',
                background: overdue ? '#fdecea' : allSubmitted ? '#edf7ed' : '#fff',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 6 }}>
                {hebMonth(m)} {year}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                מועד הגשה: {deadline.toLocaleDateString('he-IL')}
              </div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                {filesForMonth.length === 0
                  ? 'אין קבצים'
                  : `${filesForMonth.length} קבצים — ${filesForMonth.filter((f) => f.status === 'submitted' || f.status === 'confirmed').length} הוגשו`}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 24, padding: 12, border: '1px solid #f0ad4e', borderRadius: 6 }}>
        <strong>שנתי:</strong> מועד הגשת טופס 856 ושאר הדוחות השנתיים — 15.7.{year + 1}
      </div>
    </div>
  );
}

function hebMonth(m: number): string {
  return [
    'ינואר',
    'פברואר',
    'מרץ',
    'אפריל',
    'מאי',
    'יוני',
    'יולי',
    'אוגוסט',
    'ספטמבר',
    'אוקטובר',
    'נובמבר',
    'דצמבר',
  ][m - 1];
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 12,
};

const cellStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  borderRadius: 6,
  padding: 12,
  minHeight: 80,
};
