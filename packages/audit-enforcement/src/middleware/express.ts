/**
 * Express middleware — חולץ user/ip/ua/request-id מהבקשה ומקים AsyncLocalStorage.
 */
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { auditContext, type AuditContext } from '../context';

export interface ExpressAuditOptions {
  /** פונקציה לחילוץ user_id מהבקשה (למשל מ-req.user.id) */
  getUserId?: (req: Request) => string | null;
  /** פונקציה לחילוץ tenant_id (לרב-דייריות) */
  getTenantId?: (req: Request) => string | null;
  /** פונקציה לחילוץ role */
  getRole?: (req: Request) => string | null;
}

export function expressAuditMiddleware(options: ExpressAuditOptions = {}) {
  return function auditMw(req: Request, res: Response, next: NextFunction) {
    const ctx: AuditContext = {
      user_id: options.getUserId?.(req) ?? (req as Request & { user?: { id?: string } }).user?.id ?? null,
      ip:
        (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
        req.socket.remoteAddress ??
        null,
      ua: req.headers['user-agent'] ?? null,
      request_id:
        (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
      tenant_id: options.getTenantId?.(req) ?? null,
      role: options.getRole?.(req) ?? null,
      channel: 'web',
    };
    res.setHeader('x-request-id', ctx.request_id ?? '');
    auditContext.run(ctx, () => next());
  };
}
