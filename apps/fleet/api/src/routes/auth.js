import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { signToken } from '../middleware/auth.js';
import { ERR } from '../utils/hebrew.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'MANAGER', 'DRIVER']).optional(),
  phone: z.string().optional(),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION, details: parsed.error.flatten() });
  const { email, password, name, role = 'DRIVER', phone } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: ERR.EMAIL_EXISTS });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hash, name, role, phone },
  });
  if (role === 'DRIVER') {
    await prisma.driver.create({ data: { userId: user.id, name, phone } });
  }
  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, email, name, role } });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: ERR.VALIDATION });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: ERR.BAD_CREDENTIALS });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: ERR.BAD_CREDENTIALS });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

authRouter.get('/me', async (req, res) => {
  const header = req.headers.authorization || '';
  if (!header) return res.status(401).json({ error: ERR.UNAUTHORIZED });
  // light handler: rely on authRequired in production
  res.json({ ok: true });
});
