/**
 * searchAuditLogs — חיפוש מבוקר ביומן הביקורת.
 * RLS צד DB מבטיח שמשתמש שאינו GENERAL_ADMIN יראה רק את ה-tenant שלו.
 */
import type { PrismaClient, Prisma } from '@prisma/client';

export interface AuditSearchQuery {
  userId?: string;
  model?: string;
  action?: string;
  recordId?: string;
  tenantId?: string;
  /** טווח תאריכים — from inclusive, to exclusive */
  from?: Date;
  to?: Date;
  /** חיפוש טקסט חופשי בערך oldValues / newValues (JSON contains) */
  text?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditSearchResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function searchAuditLogs<T = unknown>(
  prisma: PrismaClient,
  query: AuditSearchQuery,
): Promise<AuditSearchResult<T>> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, query.pageSize ?? 50));

  const where: Prisma.AuditLogWhereInput = {
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.model ? { model: query.model } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.recordId ? { recordId: query.recordId } : {}),
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lt: query.to } : {}),
          },
        }
      : {}),
    ...(query.text
      ? {
          OR: [
            // string_contains על JSON ב-Prisma + Postgres
            { oldValues: { path: [], string_contains: query.text } as unknown as Prisma.JsonFilter },
            { newValues: { path: [], string_contains: query.text } as unknown as Prisma.JsonFilter },
          ],
        }
      : {}),
  };

  // @ts-expect-error — AuditLog
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items: items as T[], total: total as number, page, pageSize };
}
