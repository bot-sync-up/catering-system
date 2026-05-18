import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuditContext } from './types';

/**
 * AsyncLocalStorage-based audit context.
 *
 * The auditContextMiddleware wraps each HTTP request in a `run()` so that
 * every Prisma call deep inside the handler can reach back and discover
 * "who is doing this and from where" without explicit plumbing.
 */
const storage = new AsyncLocalStorage<AuditContext>();

export function runWithAuditContext<T>(ctx: AuditContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getAuditContext(): AuditContext | null {
  return storage.getStore() ?? null;
}

/**
 * For background jobs / CLI tasks that aren't tied to an HTTP request.
 * Always pass a clear `userId` (or 'system') so the audit row isn't
 * misattributed.
 */
export function withSystemContext<T>(reason: string, fn: () => T): T {
  return runWithAuditContext(
    {
      userId: `system:${reason}`,
      userRole: 'SYSTEM',
      tenantId: null,
      ip: null,
      userAgent: 'system-job',
      requestId: `sys-${Date.now()}`,
    },
    fn,
  );
}
