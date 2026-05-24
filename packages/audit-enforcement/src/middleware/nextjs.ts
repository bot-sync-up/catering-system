/**
 * Next.js (App Router) middleware helper.
 *
 * אפשרות א': עטיפה ידנית של route handlers ע"י withAudit(handler).
 * אפשרות ב': קריאה ידנית מ-Server Action בעזרת runWithAuditContext.
 */
import { randomUUID } from 'node:crypto';
import { auditContext, type AuditContext } from '../context';

type NextRequestLike = {
  headers: { get(name: string): string | null };
  ip?: string;
};

type Handler<TArgs extends unknown[], TRet> = (
  req: NextRequestLike,
  ...args: TArgs
) => Promise<TRet> | TRet;

export interface NextAuditOptions {
  /** שליפת user_id (לרוב מה-session: getServerSession וכו') */
  getUserId?: (req: NextRequestLike) => Promise<string | null> | string | null;
  getTenantId?: (req: NextRequestLike) => Promise<string | null> | string | null;
  getRole?: (req: NextRequestLike) => Promise<string | null> | string | null;
}

export function nextjsAuditMiddleware<TArgs extends unknown[], TRet>(
  handler: Handler<TArgs, TRet>,
  options: NextAuditOptions = {},
): Handler<TArgs, TRet> {
  return async (req, ...args) => {
    const ctx: AuditContext = {
      user_id: (await options.getUserId?.(req)) ?? null,
      ip:
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.ip ??
        null,
      ua: req.headers.get('user-agent'),
      request_id: req.headers.get('x-request-id') ?? randomUUID(),
      tenant_id: (await options.getTenantId?.(req)) ?? null,
      role: (await options.getRole?.(req)) ?? null,
      channel: 'web',
    };
    return auditContext.run(ctx, () => handler(req, ...args));
  };
}
