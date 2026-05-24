/**
 * JWT tokens (access + refresh) ו-CSRF
 */
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { loadConfig } from '../config';

export interface TokenPayload {
  sub: string;        // user id
  sid: string;        // session id
  roles: string[];
  twoFa: boolean;
  type: 'access' | 'refresh';
}

export function signAccess(payload: Omit<TokenPayload, 'type'>): string {
  const cfg = loadConfig();
  return jwt.sign({ ...payload, type: 'access' }, cfg.JWT_SECRET, {
    expiresIn: cfg.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
    issuer: cfg.APP_NAME,
  });
}

export function signRefresh(payload: Omit<TokenPayload, 'type'>): string {
  const cfg = loadConfig();
  return jwt.sign({ ...payload, type: 'refresh' }, cfg.JWT_SECRET, {
    expiresIn: cfg.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'],
    issuer: cfg.APP_NAME,
  });
}

export function verifyToken(token: string, expected: 'access' | 'refresh'): TokenPayload {
  const cfg = loadConfig();
  const decoded = jwt.verify(token, cfg.JWT_SECRET, { issuer: cfg.APP_NAME }) as TokenPayload;
  if (decoded.type !== expected) {
    throw new Error(`Invalid token type: expected ${expected}, got ${decoded.type}`);
  }
  return decoded;
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function timingSafeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
