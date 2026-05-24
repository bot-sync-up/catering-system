/**
 * JWT Config — מקור אמת יחיד לתצורת JWT.
 *
 * דרישות אבטחה:
 *  - access token חי 15 דקות בלבד.
 *  - refresh token חי 7 ימים, rotation על כל שימוש.
 *  - HS256 חייב secret >= 32 בייט אקראיים (256 bit).
 *  - איסור על "secret" / "changeme" / מחרוזות קצרות.
 */
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const JwtConfigSchema = z.object({
  accessSecret: z.string().min(32, 'access secret חייב 32+ תווים (256 bit)'),
  refreshSecret: z.string().min(32, 'refresh secret חייב 32+ תווים (256 bit)'),
  accessTtlSeconds: z.number().int().positive().default(15 * 60),
  refreshTtlSeconds: z.number().int().positive().default(7 * 24 * 60 * 60),
  issuer: z.string().min(1),
  audience: z.string().min(1),
});

export type JwtConfig = z.infer<typeof JwtConfigSchema>;

const WEAK_SECRETS = new Set([
  'secret', 'changeme', 'password', '12345678', 'jwt_secret',
  'mysecret', 'topsecret', 'default', '00000000',
]);

export function assertStrongSecret(name: string, value: string): void {
  if (!value) throw new Error(`${name} ריק`);
  if (value.length < 32) throw new Error(`${name} קצר מ-32 תווים`);
  if (WEAK_SECRETS.has(value.toLowerCase())) throw new Error(`${name} ברשימה השחורה`);
  // entropy בסיסי: לפחות 16 תווים שונים
  const unique = new Set(value).size;
  if (unique < 16) throw new Error(`${name} בעל entropy נמוך מדי`);
}

/**
 * מייצר secret חזק חדש.
 */
export function generateSecret(bytes: number = 64): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * טוען מהסביבה ומאמת. זורק שגיאות מפורשות אם חסר/חלש.
 */
export function loadJwtConfigFromEnv(env: NodeJS.ProcessEnv = process.env): JwtConfig {
  const accessSecret = env.JWT_ACCESS_SECRET || '';
  const refreshSecret = env.JWT_REFRESH_SECRET || '';
  assertStrongSecret('JWT_ACCESS_SECRET', accessSecret);
  assertStrongSecret('JWT_REFRESH_SECRET', refreshSecret);
  if (accessSecret === refreshSecret) {
    throw new Error('access ו-refresh חייבים להיות שונים');
  }

  return JwtConfigSchema.parse({
    accessSecret,
    refreshSecret,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SEC ? Number(env.JWT_ACCESS_TTL_SEC) : 15 * 60,
    refreshTtlSeconds: env.JWT_REFRESH_TTL_SEC ? Number(env.JWT_REFRESH_TTL_SEC) : 7 * 24 * 60 * 60,
    issuer: env.JWT_ISSUER || '',
    audience: env.JWT_AUDIENCE || '',
  });
}

export interface AccessPayload {
  sub: string;
  roles: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sign(payload: object, secret: string): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const sig = b64url(createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
}

function verifySig(token: string, secret: string): { ok: boolean; payload: any | null } {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, payload: null };
  const [h, b, s] = parts as [string, string, string];
  const data = `${h}.${b}`;
  const expected = b64url(createHmac('sha256', secret).update(data).digest());
  const a = Buffer.from(s);
  const e = Buffer.from(expected);
  if (a.length !== e.length || !timingSafeEqual(a, e)) return { ok: false, payload: null };
  try {
    return { ok: true, payload: JSON.parse(Buffer.from(b, 'base64url').toString('utf8')) };
  } catch {
    return { ok: false, payload: null };
  }
}

export function issueAccessToken(
  cfg: JwtConfig,
  subject: string,
  roles: string[],
  now: Date = new Date(),
): string {
  const iat = Math.floor(now.getTime() / 1000);
  const payload: AccessPayload = {
    sub: subject,
    roles,
    iat,
    exp: iat + cfg.accessTtlSeconds,
    iss: cfg.issuer,
    aud: cfg.audience,
  };
  return sign(payload, cfg.accessSecret);
}

export function issueRefreshToken(
  cfg: JwtConfig,
  subject: string,
  jti: string = randomBytes(16).toString('hex'),
  now: Date = new Date(),
): { token: string; jti: string; expiresAt: Date } {
  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + cfg.refreshTtlSeconds;
  const payload = { sub: subject, jti, iat, exp, iss: cfg.issuer, aud: cfg.audience };
  return {
    token: sign(payload, cfg.refreshSecret),
    jti,
    expiresAt: new Date(exp * 1000),
  };
}

export function verifyAccessToken(
  cfg: JwtConfig,
  token: string,
  now: Date = new Date(),
): AccessPayload {
  const { ok, payload } = verifySig(token, cfg.accessSecret);
  if (!ok) throw new Error('חתימת access token לא תקפה');
  if (payload.iss !== cfg.issuer) throw new Error('issuer לא תואם');
  if (payload.aud !== cfg.audience) throw new Error('audience לא תואם');
  if (payload.exp < Math.floor(now.getTime() / 1000)) throw new Error('access token פג תוקף');
  return payload as AccessPayload;
}

export function verifyRefreshToken(
  cfg: JwtConfig,
  token: string,
  now: Date = new Date(),
): { sub: string; jti: string; exp: number } {
  const { ok, payload } = verifySig(token, cfg.refreshSecret);
  if (!ok) throw new Error('חתימת refresh token לא תקפה');
  if (payload.iss !== cfg.issuer) throw new Error('issuer לא תואם');
  if (payload.aud !== cfg.audience) throw new Error('audience לא תואם');
  if (payload.exp < Math.floor(now.getTime() / 1000)) throw new Error('refresh token פג תוקף');
  return payload;
}
