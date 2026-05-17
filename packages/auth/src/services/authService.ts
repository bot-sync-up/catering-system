/**
 * שירות auth — ההיגיון העסקי הליבה: signup, login, 2FA, refresh, logout, forgot-password, OAuth-link.
 */
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { hashPassword, verifyPassword, isStrongPassword } from '../crypto/password';
import { signAccess, signRefresh } from '../crypto/tokens';
import { encryptField } from '../crypto/aes';
import {
  generateTotpSetup, verifyTotp, generateBackupCodes, consumeBackupCode,
} from '../2fa/totp';
import { issueSmsOtp, verifySmsOtp, SmsSender } from '../2fa/sms';
import {
  createSession, getSession, markTwoFaPassed, revokeSession, revokeAllForUser, listUserSessions, getRedis,
} from '../session/store';
import { UserRepository, buildUser, NewUserInput } from '../db/repository';
import { loadConfig } from '../config';
import { User, OAuthProfile, Role, Category } from '../types';

export interface LoginInput {
  email: string;
  password: string;
  ip: string;
  userAgent: string;
  device: string;
}

export interface LoginResult {
  status: 'ok' | '2fa_required';
  user?: User;
  sessionId?: string;
  accessToken?: string;
  refreshToken?: string;
  twoFaMethods?: ('totp' | 'sms')[];
}

export class AuthService {
  constructor(
    private repo: UserRepository,
    private smsSender: SmsSender,
  ) {}

  // ========== SIGNUP ==========
  async signup(input: NewUserInput & { password?: string }): Promise<User> {
    if (input.password) {
      const s = isStrongPassword(input.password);
      if (!s.ok) throw new Error(s.reason ?? 'סיסמה חלשה');
    }
    const passwordHash = input.password ? await hashPassword(input.password) : null;
    const user = buildUser(uuid(), {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      roles: input.roles ?? ['customer'],
      category: input.category ?? 'official',
    });
    return this.repo.insert(user);
  }

  // ========== LOGIN ==========
  async login(input: LoginInput): Promise<LoginResult> {
    const cfg = loadConfig();
    const user = await this.repo.findByEmail(input.email);
    // הגנה מפני enumeration: אותו מסר שגיאה
    if (!user || !user.passwordHash) {
      throw new Error('אימייל או סיסמה שגויים');
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new Error('החשבון נעול זמנית עקב ניסיונות התחברות כושלים');
    }
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      const lockedUntil = failed >= cfg.LOCKOUT_THRESHOLD
        ? new Date(Date.now() + cfg.LOCKOUT_DURATION_SEC * 1000)
        : null;
      await this.repo.update(user.id, {
        failedLoginCount: failed,
        lockedUntil,
      });
      throw new Error('אימייל או סיסמה שגויים');
    }
    // איפוס ניסיונות כושלים
    await this.repo.update(user.id, { failedLoginCount: 0, lockedUntil: null });

    const sess = await createSession({
      userId: user.id,
      device: input.device,
      ip: input.ip,
      userAgent: input.userAgent,
      twoFaPassed: !user.twoFaEnabled,
    });

    if (user.twoFaEnabled) {
      // אם SMS פעיל — שולח OTP מיד
      const methods: ('totp' | 'sms')[] = [];
      if (user.totpSecretEnc) methods.push('totp');
      if (user.smsOtpEnabled && user.phone) {
        methods.push('sms');
        await issueSmsOtp(user.id, user.phone, this.smsSender);
      }
      // טוקן ביניים — sid בלבד, ללא רמת 2fa=true
      const accessToken = signAccess({ sub: user.id, sid: sess.id, roles: user.roles, twoFa: false });
      return { status: '2fa_required', sessionId: sess.id, accessToken, twoFaMethods: methods };
    }

    const accessToken  = signAccess({ sub: user.id, sid: sess.id, roles: user.roles, twoFa: true });
    const refreshToken = signRefresh({ sub: user.id, sid: sess.id, roles: user.roles, twoFa: true });
    return { status: 'ok', user, sessionId: sess.id, accessToken, refreshToken };
  }

  // ========== 2FA verify ==========
  async verify2Fa(userId: string, sid: string, method: 'totp' | 'sms' | 'backup', code: string): Promise<LoginResult> {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error('משתמש לא נמצא');
    const sess = await getSession(sid);
    if (!sess || sess.userId !== userId) throw new Error('סשן לא תקף');

    let ok = false;
    if (method === 'totp' && user.totpSecretEnc) {
      ok = verifyTotp(user.totpSecretEnc, code);
    } else if (method === 'sms') {
      ok = await verifySmsOtp(userId, code);
    } else if (method === 'backup') {
      const codes = await this.repo.getBackupCodes(userId);
      const r = consumeBackupCode(codes, code);
      ok = r.ok;
      if (ok) await this.repo.setBackupCodes(userId, r.remaining);
    }
    if (!ok) throw new Error('קוד אימות שגוי');

    await markTwoFaPassed(sid);
    const accessToken  = signAccess({ sub: user.id, sid, roles: user.roles, twoFa: true });
    const refreshToken = signRefresh({ sub: user.id, sid, roles: user.roles, twoFa: true });
    return { status: 'ok', user, sessionId: sid, accessToken, refreshToken };
  }

  // ========== Setup TOTP ==========
  async setupTotp(userId: string): Promise<{ qrDataUrl: string; otpauthUrl: string; backupCodes: string[] }> {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error('משתמש לא נמצא');
    const setup = await generateTotpSetup(user.email);
    const codes = generateBackupCodes(10);
    await this.repo.update(userId, { totpSecretEnc: setup.encSecret, twoFaEnabled: true });
    await this.repo.setBackupCodes(userId, codes.hashed);
    return { qrDataUrl: setup.qrDataUrl, otpauthUrl: setup.otpauthUrl, backupCodes: codes.plain };
  }

  // ========== Refresh ==========
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { verifyToken } = await import('../crypto/tokens');
    const payload = verifyToken(refreshToken, 'refresh');
    const sess = await getSession(payload.sid);
    if (!sess) throw new Error('סשן לא תקף');
    const user = await this.repo.findById(sess.userId);
    if (!user || !user.isActive) throw new Error('משתמש לא פעיל');
    const accessToken  = signAccess({ sub: user.id, sid: sess.id, roles: user.roles, twoFa: sess.twoFaPassed });
    const newRefresh   = signRefresh({ sub: user.id, sid: sess.id, roles: user.roles, twoFa: sess.twoFaPassed });
    return { accessToken, refreshToken: newRefresh };
  }

  // ========== Logout ==========
  async logout(sid: string): Promise<void> {
    await revokeSession(sid);
  }

  async logoutAll(userId: string): Promise<number> {
    return revokeAllForUser(userId);
  }

  async listSessions(userId: string) {
    return listUserSessions(userId);
  }

  // ========== Forgot password ==========
  async requestPasswordReset(email: string): Promise<{ token: string } | null> {
    const user = await this.repo.findByEmail(email);
    if (!user) return null; // אנונימי — אין enumeration
    const token = crypto.randomBytes(32).toString('hex');
    const r = getRedis();
    await r.set(`pwreset:${token}`, user.id, 'EX', 60 * 30);
    return { token };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const s = isStrongPassword(newPassword);
    if (!s.ok) throw new Error(s.reason ?? 'סיסמה חלשה');
    const r = getRedis();
    const userId = await r.get(`pwreset:${token}`);
    if (!userId) throw new Error('הטוקן לא תקף או פג תוקפו');
    const hash = await hashPassword(newPassword);
    await this.repo.update(userId, { passwordHash: hash, passwordAlgo: 'argon2id' });
    await r.del(`pwreset:${token}`);
    // מאלץ logout בכל המכשירים אחרי איפוס סיסמה
    await revokeAllForUser(userId);
  }

  // ========== OAuth login/link ==========
  async loginWithOAuth(profile: OAuthProfile, ctx: { ip: string; userAgent: string; device: string }): Promise<LoginResult> {
    let user = await this.repo.findByOAuth(profile.provider, profile.providerUserId);
    if (!user) {
      user = await this.repo.findByEmail(profile.email);
      if (user) {
        await this.repo.linkOAuth(user.id, profile.provider, profile.providerUserId);
      } else {
        user = await this.repo.insert(buildUser(uuid(), {
          email: profile.email,
          passwordHash: null,
          fullName: profile.fullName,
          roles: ['customer'],
          category: 'official',
        }));
        await this.repo.linkOAuth(user.id, profile.provider, profile.providerUserId);
      }
    }
    const sess = await createSession({
      userId: user.id,
      device: ctx.device, ip: ctx.ip, userAgent: ctx.userAgent,
      twoFaPassed: !user.twoFaEnabled,
    });
    if (user.twoFaEnabled) {
      const accessToken = signAccess({ sub: user.id, sid: sess.id, roles: user.roles, twoFa: false });
      return { status: '2fa_required', sessionId: sess.id, accessToken };
    }
    const accessToken  = signAccess({ sub: user.id, sid: sess.id, roles: user.roles, twoFa: true });
    const refreshToken = signRefresh({ sub: user.id, sid: sess.id, roles: user.roles, twoFa: true });
    return { status: 'ok', user, sessionId: sess.id, accessToken, refreshToken };
  }

  // ========== Encrypt sensitive fields helper ==========
  async setSensitive(userId: string, fields: { salary?: string; bankAccount?: string; nationalId?: string }): Promise<void> {
    const patch: Partial<User> = {};
    if (fields.salary !== undefined)      patch.salaryEnc      = encryptField(fields.salary);
    if (fields.bankAccount !== undefined) patch.bankAccountEnc = encryptField(fields.bankAccount);
    if (fields.nationalId !== undefined)  patch.nationalIdEnc  = encryptField(fields.nationalId);
    await this.repo.update(userId, patch);
  }
}
