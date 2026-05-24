import type { PrismaClient, Prisma } from '@prisma/client';
import { NON_AUDITED_MODELS, type AuditAction } from './types';
import { sanitize, diff } from './sanitize';
import { getAuditContext } from './context';

/**
 * Prisma middleware that records CRUD on every model except those listed
 * in NON_AUDITED_MODELS.
 *
 * For UPDATE / DELETE we read the row BEFORE the action runs so we can
 * capture old values. The cost is one extra SELECT per write; acceptable
 * for a Q&A platform of this scale and a non-negotiable audit requirement.
 *
 * Special case: writing to `Answer` — we detect changes to `isOfficial`
 * and emit an additional OFFICIAL_TAG_CHANGE row alongside the regular
 * UPDATE row, so admins can filter the official-tag history directly.
 */
export function attachAuditMiddleware(prisma: PrismaClient): void {
  prisma.$use(async (params: Prisma.MiddlewareParams, next) => {
    const model = params.model;
    if (!model || NON_AUDITED_MODELS.has(model)) {
      return next(params);
    }

    const ctx = getAuditContext();
    const action = mapAction(params.action);
    if (!action) return next(params);

    let oldRow: Record<string, unknown> | null = null;

    // Capture pre-image for UPDATE / DELETE
    if (
      params.action === 'update' ||
      params.action === 'updateMany' ||
      params.action === 'delete' ||
      params.action === 'deleteMany'
    ) {
      try {
        const where = (params.args as { where?: unknown })?.where;
        if (where) {
          // @ts-expect-error — dynamic delegate access
          const found = await prisma[lowerFirst(model)].findFirst({ where });
          oldRow = (found as Record<string, unknown>) ?? null;
        }
      } catch {
        // pre-image read is best-effort — don't fail the original op
      }
    }

    const result = await next(params);

    // Determine entityId from result or args
    const entityId = extractEntityId(result, params.args);
    const newRow =
      params.action === 'delete' || params.action === 'deleteMany'
        ? null
        : (result as Record<string, unknown> | null) ?? null;

    const { old: oldDelta, new: newDelta } =
      action === 'UPDATE'
        ? diff(oldRow ?? undefined, newRow ?? undefined)
        : { old: oldRow ?? {}, new: newRow ?? {} };

    // Write the main audit row (fire-and-forget — see writer.ts for error policy)
    void prisma.auditLog
      .create({
        data: {
          userId: ctx?.userId ?? null,
          entityType: model,
          entityId: entityId ? String(entityId) : null,
          action,
          oldValues:
            action === 'CREATE' ? undefined : (sanitize(oldDelta) as object),
          newValues:
            action === 'DELETE' ? undefined : (sanitize(newDelta) as object),
          ip: ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
          tenantId: ctx?.tenantId ?? null,
        },
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[audit-mw] failed to record', model, action, err);
      });

    // Detect official-tag flips on Answer and log a dedicated row
    if (
      model === 'Answer' &&
      action === 'UPDATE' &&
      oldRow &&
      newRow &&
      'isOfficial' in oldRow &&
      'isOfficial' in newRow &&
      oldRow.isOfficial !== newRow.isOfficial
    ) {
      void prisma.auditLog
        .create({
          data: {
            userId: ctx?.userId ?? null,
            entityType: 'Answer',
            entityId: entityId ? String(entityId) : null,
            action: 'OFFICIAL_TAG_CHANGE' as AuditAction as never,
            oldValues: { isOfficial: oldRow.isOfficial },
            newValues: { isOfficial: newRow.isOfficial },
            ip: ctx?.ip ?? null,
            userAgent: ctx?.userAgent ?? null,
            tenantId: ctx?.tenantId ?? null,
          },
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[audit-mw] failed to record OFFICIAL_TAG_CHANGE', err);
        });
    }

    return result;
  });
}

function mapAction(prismaAction: Prisma.PrismaAction): AuditAction | null {
  switch (prismaAction) {
    case 'create':
    case 'createMany':
      return 'CREATE';
    case 'update':
    case 'updateMany':
    case 'upsert':
      return 'UPDATE';
    case 'delete':
    case 'deleteMany':
      return 'DELETE';
    default:
      // findX, count, aggregate, etc. — not auditable as writes
      return null;
  }
}

function extractEntityId(
  result: unknown,
  args: unknown,
): string | number | null {
  if (
    result &&
    typeof result === 'object' &&
    'id' in (result as Record<string, unknown>)
  ) {
    return (result as { id: string | number }).id;
  }
  const where = (args as { where?: { id?: string | number } } | undefined)
    ?.where;
  return where?.id ?? null;
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
