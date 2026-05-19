/**
 * AsyncLocalStorage לאחסון הקשר ביקורת (request context).
 * מאפשר למידלוור Prisma לדעת מי המשתמש המבצע פעולה גם בשרשרות אסינכרוניות עמוקות.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditContext {
  user_id: string | null;
  ip: string | null;
  ua: string | null;
  request_id: string | null;
  tenant_id: string | null;
  role: string | null;
  /** ערוץ הגישה: web | mobile | trpc | system */
  channel?: 'web' | 'mobile' | 'trpc' | 'system';
}

export const auditContext = new AsyncLocalStorage<AuditContext>();

/**
 * הרצת קוד בתוך הקשר ביקורת. כל קריאה ל-Prisma שתבוצע בתוך
 * הפונקציה (כולל async) תקבל גישה ל-getAuditContext().
 */
export function runWithAuditContext<T>(ctx: AuditContext, fn: () => Promise<T> | T): Promise<T> | T {
  return auditContext.run(ctx, fn);
}

/**
 * קבלת הקשר נוכחי. מחזיר ערכי ברירת מחדל אם אין הקשר —
 * חשוב כדי שעבודות רקע (cron, BullMQ) לא יקרסו, אלא ייכתבו כ-system.
 */
export function getAuditContext(): AuditContext {
  return (
    auditContext.getStore() ?? {
      user_id: null,
      ip: null,
      ua: null,
      request_id: null,
      tenant_id: null,
      role: null,
      channel: 'system',
    }
  );
}
