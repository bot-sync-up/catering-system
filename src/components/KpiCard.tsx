import React from 'react';

export interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  format?: 'number' | 'currency' | 'percent';
}

export function KpiCard({ label, value, delta, format = 'number' }: KpiCardProps) {
  const formatted =
    typeof value === 'number'
      ? format === 'currency'
        ? new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value)
        : format === 'percent'
          ? `${(value * 100).toFixed(1)}%`
          : new Intl.NumberFormat('he-IL').format(value)
      : value;

  return (
    <div className="kpi-card">
      <div className="label">{label}</div>
      <div className="value">{formatted}</div>
      {typeof delta === 'number' && (
        <div className={`delta ${delta >= 0 ? 'positive' : 'negative'}`}>
          {delta >= 0 ? '▲' : '▼'} {(Math.abs(delta) * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
