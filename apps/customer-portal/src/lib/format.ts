export function ils(n: number): string {
  try {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n} ש"ח`;
  }
}

export function dateHe(ts: number): string {
  try {
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString('he-IL');
  }
}
