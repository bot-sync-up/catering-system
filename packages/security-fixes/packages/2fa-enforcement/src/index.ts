/**
 * 2FA Enforcement Middleware.
 *
 * תקנות הגנת הפרטיות (אבטחת מידע), תשע"ז-2017 — סעיף 16(ג):
 *   "גישת מנהל למאגר ברמה גבוהה תהיה באמצעות אמצעי זיהוי משניים".
 *
 * דרישה: לא לאפשר login של תפקיד בעל הרשאות admin
 * בלי שיש לו 2FA פעיל (TOTP / WebAuthn).
 */
import { z } from 'zod';

export const TwoFactorMethodSchema = z.enum(['totp', 'webauthn', 'sms']);
export type TwoFactorMethod = z.infer<typeof TwoFactorMethodSchema>;

export const UserAuthStateSchema = z.object({
  userId: z.string(),
  roles: z.array(z.string()),
  twoFactorEnrolled: z.array(TwoFactorMethodSchema),
  twoFactorVerifiedAt: z.date().nullable(),
});

export type UserAuthState = z.infer<typeof UserAuthStateSchema>;

export interface EnforcementConfig {
  /** תפקידים שמחייבים 2FA */
  protectedRoles: string[];
  /** TTL לאחר אימות 2FA — חייבים לאשר שוב אחרי X שניות */
  twoFactorTtlSeconds: number;
  /** האם לאפשר sms (פחות מאובטח) */
  allowSms: boolean;
}

export const DEFAULT_CONFIG: EnforcementConfig = {
  protectedRoles: ['admin', 'super_admin', 'finance', 'dpo'],
  twoFactorTtlSeconds: 8 * 60 * 60, // 8 שעות
  allowSms: false,
};

export type EnforcementDecision =
  | { allow: true }
  | { allow: false; reason: 'no_2fa_enrolled' | '2fa_required' | 'sms_disallowed' | '2fa_stale'; requiredAction: 'enroll' | 'verify' };

export function evaluate(
  state: UserAuthState,
  cfg: EnforcementConfig = DEFAULT_CONFIG,
  now: Date = new Date(),
): EnforcementDecision {
  const needsProtection = state.roles.some((r) => cfg.protectedRoles.includes(r));
  if (!needsProtection) return { allow: true };

  const allowedMethods = state.twoFactorEnrolled.filter(
    (m) => cfg.allowSms || m !== 'sms',
  );

  if (!cfg.allowSms && state.twoFactorEnrolled.length === 1 && state.twoFactorEnrolled[0] === 'sms') {
    return { allow: false, reason: 'sms_disallowed', requiredAction: 'enroll' };
  }

  if (allowedMethods.length === 0) {
    return { allow: false, reason: 'no_2fa_enrolled', requiredAction: 'enroll' };
  }

  if (!state.twoFactorVerifiedAt) {
    return { allow: false, reason: '2fa_required', requiredAction: 'verify' };
  }

  const ageSec = (now.getTime() - state.twoFactorVerifiedAt.getTime()) / 1000;
  if (ageSec > cfg.twoFactorTtlSeconds) {
    return { allow: false, reason: '2fa_stale', requiredAction: 'verify' };
  }

  return { allow: true };
}

/**
 * Express/Fastify-style middleware.
 * דורש שה-req.user ימולא מ-JWT/session ב-middleware קודם.
 */
export interface MiddlewareRequest {
  user?: UserAuthState;
  path: string;
}
export interface MiddlewareResponse {
  status(code: number): MiddlewareResponse;
  json(body: object): void;
}

export function require2faMiddleware(cfg: EnforcementConfig = DEFAULT_CONFIG) {
  return (req: MiddlewareRequest, res: MiddlewareResponse, next: () => void) => {
    if (!req.user) {
      res.status(401).json({ error: 'לא מאומת' });
      return;
    }
    const decision = evaluate(req.user, cfg);
    if (decision.allow) {
      next();
      return;
    }
    const status = decision.requiredAction === 'enroll' ? 403 : 401;
    res.status(status).json({
      error: 'נדרש 2FA',
      reason: decision.reason,
      requiredAction: decision.requiredAction,
    });
  };
}
