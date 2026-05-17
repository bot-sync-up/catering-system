import React from 'react';
import type { PendingInvoice } from '../types';

const colors: Record<string, { bg: string; border: string }> = {
  info: { bg: '#eaf4ff', border: '#1f78d1' },
  warn: { bg: '#fff8e1', border: '#f0a500' },
  critical: { bg: '#fdecea', border: '#e74c3c' },
};

export const AlertList: React.FC<{ alerts: PendingInvoice['alerts'] }> = ({ alerts }) => {
  if (!alerts.length) return null;
  return (
    <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
      {alerts.map((a, i) => {
        const c = colors[a.severity] ?? colors.info;
        return (
          <div
            key={i}
            style={{
              background: c.bg,
              borderInlineStart: `4px solid ${c.border}`,
              padding: '8px 12px',
              borderRadius: 4,
            }}
          >
            <strong>[{a.kind}]</strong> {a.message}
          </div>
        );
      })}
    </div>
  );
};
