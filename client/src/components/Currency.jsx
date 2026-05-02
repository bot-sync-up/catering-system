export function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  return '₪' + Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Currency({ value }) {
  return <span>{fmt(value)}</span>;
}
