import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { ERR } from '../utils/hebrew.js';

export const driversRouter = Router();
driversRouter.use(authRequired);

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().datetime().optional(),
  notes: z.string().optional(),
  userId: z.string().nullable().optional(),
});

driversRouter.get('/', async (_req, res) => {
  const drivers = await prisma.driver.findMany({
    include: { vehicles: { select: { id: true, plate: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(drivers);
});

driversRouter.get('/me', async (req, res) => {
  const d = await prisma.driver.findUnique({
    where: { userId: req.user.id },
    include: { vehicles: true },
  });
  res.json(d);
});

driversRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION, details: parsed.error.flatten() });
  const data = { ...parsed.data };
  if (data.licenseExpiry) data.licenseExpiry = new Date(data.licenseExpiry);
  const d = await prisma.driver.create({ data });
  res.status(201).json(d);
});

driversRouter.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION });
  const data = { ...parsed.data };
  if (data.licenseExpiry) data.licenseExpiry = new Date(data.licenseExpiry);
  try {
    const d = await prisma.driver.update({ where: { id: req.params.id }, data });
    res.json(d);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e;
  }
});

driversRouter.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    await prisma.driver.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e;
  }
});
