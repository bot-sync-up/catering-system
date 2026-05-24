/**
 * Express routes for auth — signup, login, 2fa, refresh, logout, forgot, oauth.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { UserRepository } from '../db/repository';
import { loginLimiter } from '../middleware/rateLimit';
import { authenticate } from '../middleware/authenticate';
import { passport, configureOAuth } from '../oauth/providers';
import { Role } from '../types';

const VALID_ROLES: Role[] = [
  'general_manager','finance','sales','agent','kitchen_manager',
  'kitchen_worker','operations','shift_worker','driver','hr','customer',
];

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  roles: z.array(z.enum(VALID_ROLES as [Role, ...Role[]])).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verify2faSchema = z.object({
  sessionId: z.string(),
  method: z.enum(['totp', 'sms', 'backup']),
  code: z.string().min(4),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(10) });

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export function buildAuthRouter(svc: AuthService, repo: UserRepository): Router {
  configureOAuth();
  const r = Router();
  r.use(passport.initialize());

  // ----- Signup -----
  r.post('/signup', async (req: Request, res: Response) => {
    const p = signupSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'נתונים שגויים', details: p.error.issues });
    try {
      const u = await svc.signup({
        email: p.data.email,
        password: p.data.password,
        fullName: p.data.fullName,
        phone: p.data.phone,
        roles: p.data.roles ?? ['customer'],
        category: 'official',
        passwordHash: null,
      });
      return res.status(201).json({ id: u.id, email: u.email, fullName: u.fullName });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'שגיאה';
      return res.status(400).json({ error: msg });
    }
  });

  // ----- Login -----
  r.post('/login', loginLimiter(), async (req: Request, res: Response) => {
    const p = loginSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'נתונים שגויים' });
    try {
      const result = await svc.login({
        email: p.data.email,
        password: p.data.password,
        ip: req.ip ?? '',
        userAgent: req.headers['user-agent'] ?? '',
        device: (req.headers['x-device'] as string) ?? 'web',
      });
      if (result.status === '2fa_required') {
        return res.status(200).json({
          status: '2fa_required',
          sessionId: result.sessionId,
          accessToken: result.accessToken,
          methods: result.twoFaMethods,
        });
      }
      res.cookie('access_token', result.accessToken!, COOKIE_OPTS);
      res.cookie('refresh_token', result.refreshToken!, COOKIE_OPTS);
      return res.json({
        status: 'ok',
        user: { id: result.user!.id, email: result.user!.email, roles: result.user!.roles, fullName: result.user!.fullName },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'שגיאה';
      return res.status(401).json({ error: msg });
    }
  });

  // ----- Verify 2FA -----
  r.post('/2fa/verify', async (req: Request, res: Response) => {
    const p = verify2faSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'נתונים שגויים' });
    try {
      const auth = req.headers.authorization;
      const tok = auth?.startsWith('Bearer ') ? auth.substring(7) : null;
      if (!tok) return res.status(401).json({ error: 'חסר טוקן' });
      const { verifyToken } = await import('../crypto/tokens');
      const payload = verifyToken(tok, 'access');
      const result = await svc.verify2Fa(payload.sub, p.data.sessionId, p.data.method, p.data.code);
      res.cookie('access_token', result.accessToken!, COOKIE_OPTS);
      res.cookie('refresh_token', result.refreshToken!, COOKIE_OPTS);
      return res.json({
        status: 'ok',
        user: { id: result.user!.id, email: result.user!.email, roles: result.user!.roles },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'שגיאה';
      return res.status(401).json({ error: msg });
    }
  });

  // ----- Setup TOTP -----
  r.post('/2fa/setup', authenticate(repo), async (req: Request, res: Response) => {
    try {
      const out = await svc.setupTotp(req.auth!.user.id);
      return res.json(out);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'שגיאה' });
    }
  });

  // ----- Refresh -----
  r.post('/refresh', async (req: Request, res: Response) => {
    const tok = ((req as Request & { cookies?: Record<string,string> }).cookies?.refresh_token)
      ?? (req.body as { refreshToken?: string })?.refreshToken;
    if (!tok) return res.status(401).json({ error: 'חסר refresh token' });
    try {
      const t = await svc.refresh(tok);
      res.cookie('access_token', t.accessToken, COOKIE_OPTS);
      res.cookie('refresh_token', t.refreshToken, COOKIE_OPTS);
      return res.json(t);
    } catch (e) {
      return res.status(401).json({ error: e instanceof Error ? e.message : 'שגיאה' });
    }
  });

  // ----- Logout -----
  r.post('/logout', authenticate(repo), async (req: Request, res: Response) => {
    await svc.logout(req.auth!.session.id);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return res.json({ ok: true });
  });

  r.post('/logout-all', authenticate(repo), async (req: Request, res: Response) => {
    const n = await svc.logoutAll(req.auth!.user.id);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return res.json({ ok: true, revoked: n });
  });

  r.get('/sessions', authenticate(repo), async (req: Request, res: Response) => {
    const list = await svc.listSessions(req.auth!.user.id);
    return res.json({ sessions: list });
  });

  // ----- Forgot / Reset -----
  r.post('/forgot-password', async (req: Request, res: Response) => {
    const p = forgotSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'נתונים שגויים' });
    await svc.requestPasswordReset(p.data.email);
    // תמיד 200 — אין enumeration
    return res.json({ ok: true, message: 'אם הכתובת רשומה, נשלח קישור לאיפוס' });
  });

  r.post('/reset-password', async (req: Request, res: Response) => {
    const p = resetSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'נתונים שגויים' });
    try {
      await svc.resetPassword(p.data.token, p.data.newPassword);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'שגיאה' });
    }
  });

  // ----- OAuth -----
  r.get('/oauth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
  r.get('/oauth/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth' }),
    async (req: Request, res: Response) => oauthCallback(svc, req, res));

  r.get('/oauth/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));
  r.get('/oauth/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: '/login?error=oauth' }),
    async (req: Request, res: Response) => oauthCallback(svc, req, res));

  return r;
}

async function oauthCallback(svc: AuthService, req: Request, res: Response) {
  const profile = req.user as import('../types').OAuthProfile;
  if (!profile) return res.redirect('/login?error=oauth');
  const result = await svc.loginWithOAuth(profile, {
    ip: req.ip ?? '',
    userAgent: req.headers['user-agent'] ?? '',
    device: 'web',
  });
  res.cookie('access_token', result.accessToken!, COOKIE_OPTS);
  if (result.refreshToken) res.cookie('refresh_token', result.refreshToken, COOKIE_OPTS);
  if (result.status === '2fa_required') return res.redirect('/auth/2fa');
  return res.redirect('/');
}
