import { PrismaClient, type AuditAction as PrismaAuditAction } from '@prisma/client';
import { sanitize } from './sanitize';
import { getAuditContext } from './context';
import type { AuditWriteInput } from './types';

/**
 * Direct, low-level audit writer. Intended for:
 *   - the Prisma middleware (CRUD on domain tables)
 *   - the auth hook (LOGIN_SUCCESS / LOGIN_FAILURE / LOGOUT / PASSWORD_CHANGE)
 *   - the sensitive-data hook (READ_SENSITIVE)
 *   - the export hook (EXPORT)
 *   - any service that wants to log a domain-meaningful event explicitly,
 *     e.g. official-tag changes (OFFICIAL_TAG_CHANGE).
 *
 * Failures are swallowed and logged to stderr — we never want a missing
 * audit row to break the user's request, but we DO want the operator to
 * notice (alerts should be wired to stderr in prod).
 */
export async function writeAudit(
  prisma: PrismaClient,
  input: AuditWriteInput,
): Promise<void> {
  const ctx = getAuditContext();
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? ctx?.userId ?? null,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        action: input.action as PrismaAuditAction,
        oldValues:
          input.oldValues === undefined
            ? undefined
            : (sanitize(input.oldValues) as object),
        newValues:
          input.newValues === undefined
            ? undefined
            : (sanitize(input.newValues) as object),
        ip: input.ip ?? ctx?.ip ?? null,
        userAgent: input.userAgent ?? ctx?.userAgent ?? null,
        tenantId: input.tenantId ?? ctx?.tenantId ?? null,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] failed to write audit row', {
      entityType: input.entityType,
      action: input.action,
      err: (err as Error).message,
    });
  }
}
