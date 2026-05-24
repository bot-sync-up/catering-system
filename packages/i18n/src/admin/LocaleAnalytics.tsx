import React, { useMemo } from 'react';
import { LOCALE_META, SUPPORTED_LOCALES, type SupportedLocale } from '../types';

export interface LocaleUsageRow {
  locale: SupportedLocale;
  /** מס' משתמשים פעילים ב-30 הימים האחרונים */
  activeUsers: number;
  /** מס' הזמנות שנעשו ב-30 הימים האחרונים */
  orders: number;
  /** הכנסות (במטבע ה-baseline, ILS) */
  revenueILS: number;
}

export interface CompletenessRow {
  locale: SupportedLocale;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
}

export interface LocaleAnalyticsProps {
  usage: readonly LocaleUsageRow[];
  completeness: readonly CompletenessRow[];
}

/**
 * דשבורד אנליטיקה לאדמין — מציג שימוש בפועל לעומת רמת הכיסוי של התרגום.
 * עוזר להחליט אילו שפות לתעדף בהשלמת תרגומים.
 */
export function LocaleAnalytics({ usage, completeness }: LocaleAnalyticsProps) {
  const combined = useMemo(() => {
    return SUPPORTED_LOCALES.map((loc) => {
      const u = usage.find((x) => x.locale === loc) ?? { locale: loc, activeUsers: 0, orders: 0, revenueILS: 0 };
      const c = completeness.find((x) => x.locale === loc) ?? { locale: loc, totalKeys: 0, translatedKeys: 0, missingKeys: 0 };
      const pct = c.totalKeys ? Math.round((c.translatedKeys / c.totalKeys) * 100) : 100;
      return { ...u, ...c, completenessPct: pct };
    }).sort((a, b) => b.activeUsers - a.activeUsers);
  }, [usage, completeness]);

  const totalUsers = combined.reduce((s, r) => s + r.activeUsers, 0);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h2>אנליטיקת שפות</h2>
      <p style={{ color: '#666' }}>
        סה"כ {totalUsers.toLocaleString('he-IL')} משתמשים פעילים ב-30 הימים האחרונים
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>שפה</th>
            <th style={th}>משתמשים</th>
            <th style={th}>% מהשימוש</th>
            <th style={th}>הזמנות</th>
            <th style={th}>הכנסות (₪)</th>
            <th style={th}>כיסוי תרגום</th>
          </tr>
        </thead>
        <tbody>
          {combined.map((r) => {
            const sharePct = totalUsers ? (r.activeUsers / totalUsers) * 100 : 0;
            const priority = sharePct > 5 && r.completenessPct < 95 ? '⚠️ עדיפות גבוהה' : '';
            return (
              <tr key={r.locale}>
                <td style={td}>{LOCALE_META[r.locale].flag} {LOCALE_META[r.locale].nativeName}</td>
                <td style={td}>{r.activeUsers.toLocaleString('he-IL')}</td>
                <td style={td}>
                  <Bar pct={sharePct} color="#4a90e2" />
                  <span style={{ marginInlineStart: 8 }}>{sharePct.toFixed(1)}%</span>
                </td>
                <td style={td}>{r.orders.toLocaleString('he-IL')}</td>
                <td style={td}>{r.revenueILS.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</td>
                <td style={td}>
                  <Bar pct={r.completenessPct} color={r.completenessPct >= 95 ? '#5cb85c' : '#f0ad4e'} />
                  <span style={{ marginInlineStart: 8 }}>{r.completenessPct}%</span>
                  {priority && <span style={{ marginInlineStart: 8, color: 'crimson' }}>{priority}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 80,
      height: 8,
      background: '#eee',
      borderRadius: 4,
      overflow: 'hidden',
      verticalAlign: 'middle',
    }}>
      <span style={{
        display: 'block',
        width: `${Math.min(100, Math.max(0, pct))}%`,
        height: '100%',
        background: color,
      }} />
    </span>
  );
}

const th: React.CSSProperties = { textAlign: 'start', padding: 8, borderBottom: '2px solid #ddd' };
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #eee' };
