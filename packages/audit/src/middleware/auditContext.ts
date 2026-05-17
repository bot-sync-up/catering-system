import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { runWithAuditContext } from '../audit/context';
import type { AuthedRequest } from '../auth/jwt';

/**
 * Wraps every incoming request in an AsyncLocalStorage scope so that every
 * downstream Prisma operation, service function, etc. can resolve "who is
 * doing this and from where" without the caller threading it manually.
 *
 * Must be installed AFTER the JWT middleware — that one populates `req.user`.
 */
export function auditContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authed = req as AuthedRequest;
  const ip = pickIp(req);
  const userAgent = req.get('user-agent') ?? null;
  const requestId = (req.get('x-request-id') ?? randomUUID()).slice(0, 64);

  runWithAuditContext(
    {
      userId: authed.user?.id ?? null,
      userRole: authed.user?.role ?? null,
      tenantId: authed.user?.tenantId ?? null,
      ip,
      userAgent,
      requestId,
    },
    () => {
      res.setHeader('x-request-id', requestId);
      next();
    },
  );
}

function pickIp(req: Request): string | null {
  // Honour standard proxy headers, but only ever store ONE address.
  const fwd = req.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.ip ?? req.socket?.remoteAddress ?? null;
}
