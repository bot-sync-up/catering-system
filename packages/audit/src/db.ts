import { PrismaClient } from '@prisma/client';
import { attachAuditMiddleware } from './audit';
import { getAuditContext } from './audit/context';

/**
 * Singleton Prisma client.
 *
 * On every query we propagate the AsyncLocalStorage audit context into a
 * Postgres session variable via `audit_set_context()`, which the RLS
 * policies on `audit_logs` consult to decide whether the caller may SELECT.
 */
let _prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;
  const prisma = new PrismaClient({
    log: ['warn', 'error'],
  });

  // Push the per-request audit context into the DB session at the start of
  // each interactive transaction — so RLS sees the right user/role/tenant.
  prisma.$use(async (params, next) => {
    const ctx = getAuditContext();
    if (ctx) {
      try {
        await prisma.$executeRawUnsafe(
          `SELECT audit_set_context($1, $2, $3)`,
          ctx.userId ?? '',
          ctx.tenantId ?? '',
          ctx.userRole ?? '',
        );
      } catch {
        // first-run / missing function — ignored; tested in migration
      }
    }
    return next(params);
  });

  attachAuditMiddleware(prisma);
  _prisma = prisma;
  return prisma;
}
