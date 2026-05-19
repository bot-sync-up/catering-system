/**
 * Hash chain — לכל רשומת AuditLog מצורף hash SHA-256 הכולל את כל
 * השדות שלה + ה-hash של הרשומה הקודמת. כך שינוי בודד באמצע השרשרת
 * שובר את כל מי שאחריו ומאפשר זיהוי tampering.
 */
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export interface AuditLogPayload {
  model: string;
  action: string;
  recordId: string | null;
  oldValues: unknown;
  newValues: unknown;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  tenantId: string | null;
  role: string | null;
  channel: string;
  createdAt: Date;
}

/**
 * חישוב hash על שורת ביקורת. הסדר חייב להיות יציב לחלוטין —
 * כל שינוי באלגוריתם מצריך גרסה חדשה (algorithm version).
 */
export function computeRowHash(payload: AuditLogPayload, prevHash: string | null): string {
  const canonical = JSON.stringify({
    model: payload.model,
    action: payload.action,
    recordId: payload.recordId,
    oldValues: stableStringify(payload.oldValues),
    newValues: stableStringify(payload.newValues),
    userId: payload.userId,
    ip: payload.ip,
    userAgent: payload.userAgent,
    requestId: payload.requestId,
    tenantId: payload.tenantId,
    role: payload.role,
    channel: payload.channel,
    createdAt: payload.createdAt.toISOString(),
    prevHash: prevHash ?? '',
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * שולף את ה-hash של הרשומה האחרונה ומחשב hash חדש לפיו.
 * חוזר עם אובייקט מוכן ל-prisma.auditLog.create.
 *
 * זה לא חסין race conditions של 100% — בעומס גבוה ייתכנו שני
 * רשומות שנשלפו את אותו prevHash. למימוש חזק יש להשתמש ב-advisory
 * lock או טריגר Postgres שמחשב את ה-hash בצד ה-DB.
 */
export async function linkHashChain<T extends AuditLogPayload>(
  prisma: PrismaClient,
  payload: T,
): Promise<T & { hash: string; prevHash: string | null }> {
  // @ts-expect-error — AuditLog
  const last = await prisma.auditLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });
  const prevHash: string | null = (last as { hash: string | null } | null)?.hash ?? null;
  const hash = computeRowHash(payload, prevHash);
  return { ...payload, hash, prevHash };
}

/**
 * stringify עם מפתחות ממוינים — חיוני כדי שאותו תוכן ייתן אותו hash
 * בלי קשר לסדר ה-keys בזיכרון.
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map((v) => stableStringify(v)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') +
    '}'
  );
}
