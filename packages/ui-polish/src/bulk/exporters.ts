/** ייצוא נתונים ל-CSV / Excel. נטען xlsx באופן עצל כדי לא להעמיס bundle. */

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** מייצא רשימת אובייקטים ל-CSV עם BOM (עברית תקינה ב-Excel). */
export function exportToCSV<T extends Record<string, unknown>>(
  rows: T[],
  filename = 'export.csv',
  columns?: { key: keyof T; header: string }[],
): void {
  if (rows.length === 0) return;
  const cols =
    columns ??
    (Object.keys(rows[0]!) as (keyof T)[]).map((k) => ({ key: k, header: String(k) }));
  const header = cols.map((c) => escapeCsv(c.header)).join(',');
  const body = rows.map((r) => cols.map((c) => escapeCsv(r[c.key])).join(',')).join('\n');
  const csv = '﻿' + header + '\n' + body;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

/** מייצא רשימת אובייקטים ל-XLSX. דורש את החבילה xlsx (Peer optional). */
export async function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  filename = 'export.xlsx',
  sheetName = 'נתונים',
): Promise<void> {
  if (rows.length === 0) return;
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  if (!ws['!cols']) ws['!cols'] = [];
  ws['!views'] = [{ RTL: true }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
