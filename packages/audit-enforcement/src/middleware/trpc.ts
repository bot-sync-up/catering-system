/**
 * tRPC middleware — עוטף קריאת פרוצדורה בהקשר ביקורת.
 *
 * שימוש לדוגמה:
 *   const auditedProcedure = t.procedure.use(trpcAuditMiddleware());
 */
import { randomUUID } from 'node:crypto';
import { auditContext, type AuditContext } from '../context';

interface TrpcMiddlewareOpts {
  ctx: {
    user?: { id?: string; role?: string; tenantId?: string };
    req?: {
      headers: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    };
  };
  next: () => Promise<unknown>;
}

export function trpcAuditMiddleware() {
  return async function auditMw({ ctx, next }: TrpcMiddlewareOpts) {
    const headers = ctx.req?.headers ?? {};
    const xff = headers['x-forwarded-for'];
    const ip =
      (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim() ??
      ctx.req?.socket?.remoteAddress ??
      null;

    const ua = headers['user-agent'];
    const reqId = headers['x-request-id'];

    const auditCtx: AuditContext = {
      user_id: ctx.user?.id ?? null,
      ip,
      ua: Array.isArray(ua) ? ua[0] : ua ?? null,
      request_id: (Array.isArray(reqId) ? reqId[0] : reqId) ?? randomUUID(),
      tenant_id: ctx.user?.tenantId ?? null,
      role: ctx.user?.role ?? null,
      channel: 'trpc',
    };

    return auditContext.run(auditCtx, () => next());
  };
}
