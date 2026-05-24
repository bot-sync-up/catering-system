import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface SessionUser {
  id: string;
  role: string;
  tenantId: string | null;
  email: string;
}

export interface AuthedRequest extends Request {
  user?: SessionUser;
}

const SECRET = process.env.JWT_SECRET ?? '';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '12h';

if (!SECRET || SECRET.length < 32) {
  // Fail fast on boot rather than silently running with a weak/empty secret.
  // eslint-disable-next-line no-console
  console.warn('[auth] JWT_SECRET is missing or too short — refusing to issue tokens');
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function jwtMiddleware(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    try {
      const decoded = jwt.verify(token, SECRET) as SessionUser;
      req.user = decoded;
    } catch {
      // invalid token — request continues as anonymous; protected routes will reject
    }
  }
  next();
}

/** Express guard — require any authenticated user. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  next();
}

/** Express guard — require a specific role. */
export function requireRole(role: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  };
}
