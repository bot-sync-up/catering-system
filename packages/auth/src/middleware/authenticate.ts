/**
 * Authentication middleware — מאמת JWT, טוען session, מצמיד ctx
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken } from '../crypto/tokens';
import { getSession, touchSession } from '../session/store';
import { UserRepository } from '../db/repository';
import { AuthContext } from '../types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { auth?: AuthContext }
  }
}

function extractToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.substring(7);
  const c = (req as Request & { cookies?: Record<string, string> }).cookies;
  return c?.access_token ?? null;
}

export function authenticate(repo: UserRepository, opts?: { require2Fa?: boolean }): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tok = extractToken(req);
      if (!tok) return res.status(401).json({ error: 'לא מחובר' });
      const payload = verifyToken(tok, 'access');
      const sess = await getSession(payload.sid);
      if (!sess) return res.status(401).json({ error: 'הסשן פג או בוטל' });
      const user = await repo.findById(sess.userId);
      if (!user || !user.isActive) return res.status(401).json({ error: 'משתמש לא פעיל' });
      if (opts?.require2Fa && user.twoFaEnabled && !sess.twoFaPassed) {
        return res.status(401).json({ error: 'נדרש אימות דו-שלבי', code: '2FA_REQUIRED' });
      }
      req.auth = { user, session: sess, ip: req.ip ?? '' };
      await touchSession(sess.id);
      next();
    } catch (e) {
      return res.status(401).json({ error: 'טוקן לא תקף' });
    }
  };
}
