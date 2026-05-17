import { Router, type Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { loginHook, logoutHook, passwordChangeHook } from '../hooks/authHooks';
import { requireAuth, type AuthedRequest } from '../auth/jwt';
import { getPrisma } from '../db';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

const passwordChangeSchema = z.object({
  current: z.string().min(1).max(256),
  next: z.string().min(8).max(256),
});

export function makeAuthRouter(): Router {
  const router = Router();
  const prisma = getPrisma();

  // Throttle login attempts — also reduces noise in the audit log.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  router.post('/login', loginLimiter, async (req, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const out = await loginHook(prisma, parsed.data.email, parsed.data.password, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    if (!out.ok) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }
    res.json({ token: out.token, user: out.user });
  });

  router.post('/logout', requireAuth, async (req: AuthedRequest, res: Response) => {
    await logoutHook(prisma, req.user!.id, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      tenantId: req.user!.tenantId,
    });
    res.json({ ok: true });
  });

  router.post('/password', requireAuth, async (req: AuthedRequest, res: Response) => {
    const parsed = passwordChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!me) {
      res.status(404).json({ error: 'no_user' });
      return;
    }
    const ok = await bcrypt.compare(parsed.data.current, me.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'wrong_current' });
      return;
    }
    const newHash = await bcrypt.hash(parsed.data.next, 12);
    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: newHash },
    });
    await passwordChangeHook(prisma, me.id, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      tenantId: me.tenantId,
    });
    res.json({ ok: true });
  });

  return router;
}
