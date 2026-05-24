/**
 * exportAuditLogsCsv — ייצוא תוצאות חיפוש כקובץ CSV.
 *
 * חשוב: כדי ש-Excel יזהה עברית נכון, מוסיפים BOM (UTF-8 byte-order-mark)
 * בתחילת הקובץ. בלי זה, תווים בעברית יוצגו ב-Excel כ"ג'יבריש".
 */
import type { AuditSearchQuery } from '../search/query';
import { searchAuditLogs } from '../search/query';
import type { PrismaClient } from '@prisma/client';

const UTF8_BOM = '﻿';

interface AuditLogRow {
  id: string;
  createdAt: Date;
  model: string;
  action: string;
  recordId: string | null;
  userId: string | null;
  role: string | null;
  tenantId: string | null;
  ip: string | null;
  userAgent: string | null;
  channel: string;
  oldValues: unknown;
  newValues: unknown;
  requestId: string | null;
  hash: string;
  prevHash: string | null;
}

const HEADERS: Array<{ key: keyof AuditLogRow; label: string }> = [
  { key: 'createdAt', label: 'תאריך' },
  { key: 'userId', label: 'משתמש' },
  { key: 'role', label: 'תפקיד' },
  { key: 'tenantId', label: 'דיירת (tenant)' },
  { key: 'model', label: 'מודל' },
  { key: 'action', label: 'פעולה' },
  { key: 'recordId', label: 'מזהה רשומה' },
  { key: 'oldValues', label: 'ערכים קודמים' },
  { key: 'newValues', label: 'ערכים חדשים' },
  { key: 'ip', label: 'IP' },
  { key: 'userAgent', label: 'User-Agent' },
  { key: 'channel', label: 'ערוץ' },
  { key: 'requestId', label: 'מזהה בקשה' },
  { key: 'hash', label: 'Hash' },
];

/**
 * מחזיר מחרוזת CSV מלאה. עבור קבצים גדולים שקול להחליף ב-stream API.
 */
export async function exportAuditLogsCsv(
  prisma: PrismaClient,
  query: AuditSearchQuery,
  options: { maxRows?: number } = {},
): Promise<string> {
  const maxRows = options.maxRows ?? 50000;
  const pageSize = 500;
  let page = 1;
  const lines: string[] = [];

  // כותרת
  lines.push(HEADERS.map((h) => csvEscape(h.label)).join(','));

  let collected = 0;
  while (collected < maxRows) {
    const result = await searchAuditLogs<AuditLogRow>(prisma, {
      ...query,
      page,
      pageSize,
    });
    if (result.items.length === 0) break;
    for (const row of result.items) {
      lines.push(HEADERS.map((h) => csvEscape(formatCell(row[h.key]))).join(','));
      collected++;
      if (collected >= maxRows) break;
    }
    if (result.items.length < pageSize) break;
    page++;
  }

  return UTF8_BOM + lines.join('\r\n') + '\r\n';
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
