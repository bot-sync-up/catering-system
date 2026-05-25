/**
 * Dashboard ראשי לרו"ח / מנהל כללי.
 * RTL, עברית, מתחבר ל-AccountantWorkflow דרך props.
 */
import * as React from 'react';
import type { GeneratedFile, AccountantRole } from '../../types';
import { FilesList } from './FilesList';
import { CalendarView } from './CalendarView';
import { SubmissionHistory } from './SubmissionHistory';

export interface AccountantDashboardProps {
  actor: AccountantRole;
  files: GeneratedFile[];
  onDownload: (fileId: string) => Promise<void>;
  onMarkSubmitted: (fileId: string, ref: string) => Promise<void>;
  history?: Array<{ timestamp: string; action: string; fileId?: string; reference?: string }>;
}

export function AccountantDashboard(props: AccountantDashboardProps): React.ReactElement {
  const [tab, setTab] = React.useState<'files' | 'calendar' | 'history'>('files');

  const pending = props.files.filter((f) => f.status === 'pending').length;
  const overdue = props.files.filter(
    (f) => f.status !== 'submitted' && f.status !== 'confirmed' && isDeadlinePassed(f),
  ).length;

  return (
    <div dir="rtl" lang="he" style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={{ margin: 0 }}>פורטל הרו"ח</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Badge label={`ממתין: ${pending}`} color="#f0ad4e" />
          <Badge label={`באיחור: ${overdue}`} color={overdue ? '#d9534f' : '#5cb85c'} />
        </div>
      </header>

      <nav style={navStyle}>
        <TabButton active={tab === 'files'} onClick={() => setTab('files')}>
          קבצים
        </TabButton>
        <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')}>
          יומן הגשות
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          היסטוריית הגשות
        </TabButton>
      </nav>

      <main>
        {tab === 'files' && (
          <FilesList
            actor={props.actor}
            files={props.files}
            onDownload={props.onDownload}
            onMarkSubmitted={props.onMarkSubmitted}
          />
        )}
        {tab === 'calendar' && <CalendarView files={props.files} />}
        {tab === 'history' && <SubmissionHistory entries={props.history ?? []} />}
      </main>
    </div>
  );
}

function isDeadlinePassed(file: GeneratedFile): boolean {
  // מועדי הגשה: 15 לחודש (חודשי) / 15.7 (שנתי).
  const deadline = computeDeadline(file);
  return new Date() > deadline;
}

export function computeDeadline(file: GeneratedFile): Date {
  const { year, month } = file.period;
  if (month) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return new Date(nextYear, nextMonth - 1, 15);
  }
  // שנתי - 15 ביולי השנה הבאה
  return new Date(year + 1, 6, 15);
}

function Badge({ label, color }: { label: string; color: string }): React.ReactElement {
  return (
    <span
      style={{
        background: color,
        color: '#fff',
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 13,
      }}
    >
      {label}
    </span>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        background: active ? '#0078d4' : 'transparent',
        color: active ? '#fff' : '#333',
        border: '1px solid #ddd',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 15,
      }}
    >
      {children}
    </button>
  );
}

const containerStyle: React.CSSProperties = {
  fontFamily: '"Heebo", "Assistant", system-ui, sans-serif',
  direction: 'rtl',
  padding: 24,
  maxWidth: 1200,
  margin: '0 auto',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 24,
  borderBottom: '1px solid #eee',
  paddingBottom: 12,
};
