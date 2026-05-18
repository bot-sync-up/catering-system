// Auth middleware — JWT + RBAC.
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config.js';
import { can, type Action } from '../lib/rbac.js';
import type { Role } from '@prisma/client';

export interface AuthedReq extends Request {
  user?: { id: string; orgId: string; role: Role };
}

export function authMiddleware(req: AuthedReq, res: Response, next: NextFunction) {
  const h = req.header('authorization');
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(h.slice(7), config.jwtSecret) as any;
    req.user = { id: payload.sub, orgId: payload.orgId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

export function requirePermission(action: Action) {
  return (req: AuthedReq, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'unauth' });
    if (!can(req.user.role, action)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

export function signToken(user: { id: string; orgId: string; role: Role }) {
  return jwt.sign({ sub: user.id, orgId: user.orgId, role: user.role }, config.jwtSecret, {
    expiresIn: '12h',
  });
}
