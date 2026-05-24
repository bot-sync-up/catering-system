export function fmtMoney(n, currency = 'ILS') {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(Number(n));
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('he-IL').format(new Date(d));
}

export function fmtPct(p) {
  if (p === null || p === undefined || isNaN(p)) return '—';
  if (!isFinite(p)) return '∞';
  return `${p.toFixed(1)}%`;
}
