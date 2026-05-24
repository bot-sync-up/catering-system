/**
 * Cookies מאובטחות.
 *
 * דרישות OWASP + GDPR:
 *  - Secure: cookie נשלחת רק על HTTPS.
 *  - HttpOnly: JS לא יכול לקרוא (הגנה מ-XSS).
 *  - SameSite=Strict: הגנה מ-CSRF (לחיבור ולעוגיות session).
 *  - __Host- prefix: cookie מוגנת על domain ספציפי.
 *  - Max-Age מוגדר; אסור session-only ל-tokens.
 */
import { z } from 'zod';

export const SameSiteSchema = z.enum(['Strict', 'Lax', 'None']);
export type SameSite = z.infer<typeof SameSiteSchema>;

export const CookieOptionsSchema = z.object({
  domain: z.string().optional(),
  path: z.string().default('/'),
  maxAgeSeconds: z.number().int().positive().optional(),
  secure: z.boolean().default(true),
  httpOnly: z.boolean().default(true),
  sameSite: SameSiteSchema.default('Strict'),
  /** מוסיף prefix __Host- אם path=/ ו-domain לא הוגדר */
  hostPrefix: z.boolean().default(true),
});

export type CookieOptions = z.infer<typeof CookieOptionsSchema>;

const NAME_RE = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;

function assertValidName(name: string): void {
  if (!NAME_RE.test(name)) throw new Error(`שם cookie לא חוקי: ${name}`);
  if (name.includes(' ') || name.includes(';') || name.includes('=')) {
    throw new Error('שם cookie מכיל תווים אסורים');
  }
}

function encodeValue(value: string): string {
  // value אסור להכיל ; CRLF
  if (/[\r\n;]/.test(value)) throw new Error('ערך cookie מכיל תווים מסוכנים');
  return encodeURIComponent(value);
}

/**
 * בונה ה-Set-Cookie header מאובטח.
 */
export function buildSetCookie(
  name: string,
  value: string,
  opts: Partial<CookieOptions> = {},
): string {
  assertValidName(name);
  const options = CookieOptionsSchema.parse(opts);

  // אכיפת ברירות מחדל בטוחות: SameSite=None מחייב Secure=true
  if (options.sameSite === 'None' && !options.secure) {
    throw new Error('SameSite=None מחייב Secure=true');
  }

  let finalName = name;
  if (options.hostPrefix && options.path === '/' && !options.domain && options.secure) {
    if (!name.startsWith('__Host-')) finalName = `__Host-${name}`;
  }

  const parts = [`${finalName}=${encodeValue(value)}`];
  parts.push(`Path=${options.path}`);
  if (options.domain && !finalName.startsWith('__Host-')) parts.push(`Domain=${options.domain}`);
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  if (options.secure) parts.push('Secure');
  if (options.httpOnly) parts.push('HttpOnly');
  parts.push(`SameSite=${options.sameSite}`);

  return parts.join('; ');
}

/**
 * פרופילים מומלצים לפי תפקיד.
 */
export const COOKIE_PROFILES = {
  /** session / auth */
  session: {
    secure: true,
    httpOnly: true,
    sameSite: 'Strict' as const,
    maxAgeSeconds: 15 * 60, // 15 דקות, יחד עם access token
    hostPrefix: true,
  },
  /** csrf double-submit token — חייב להיות נקרא ע"י JS */
  csrf: {
    secure: true,
    httpOnly: false,
    sameSite: 'Strict' as const,
    maxAgeSeconds: 60 * 60,
    hostPrefix: true,
  },
  /** refresh token — long-lived; httpOnly חובה */
  refresh: {
    secure: true,
    httpOnly: true,
    sameSite: 'Strict' as const,
    maxAgeSeconds: 7 * 24 * 60 * 60,
    hostPrefix: true,
  },
} satisfies Record<string, Partial<CookieOptions>>;

/**
 * בדיקה אם cookie header עומד בכללי האבטחה.
 */
export function auditCookieHeader(header: string): { secure: boolean; issues: string[] } {
  const lower = header.toLowerCase();
  const issues: string[] = [];
  if (!lower.includes('secure')) issues.push('חסר Secure');
  if (!lower.includes('httponly')) issues.push('חסר HttpOnly');
  if (!lower.match(/samesite=strict|samesite=lax/)) issues.push('חסר SameSite=Strict/Lax');
  if (lower.match(/samesite=none/) && !lower.includes('secure')) issues.push('SameSite=None ללא Secure');
  return { secure: issues.length === 0, issues };
}
