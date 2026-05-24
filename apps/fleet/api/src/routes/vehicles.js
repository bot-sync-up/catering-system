import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { ERR } from '../utils/hebrew.js';

export const vehiclesRouter = Router();
vehiclesRouter.use(authRequired);

const upsertSchema = z.object({
  plate: z.string().min(2),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1950).max(2100),
  fuel: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'GAS']),
  color: z.string().optional(),
  vin: z.string().optional(),
  currentKm: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  driverId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

vehiclesRouter.get('/', async (req, res) => {
  const { q, driverId, active } = req.query;
  const where = {};
  if (q) {
    where.OR = [
      { plate: { contains: String(q), mode: 'insensitive' } },
      { make: { contains: String(q), mode: 'insensitive' } },
      { model: { contains: String(q), mode: 'insensitive' } },
    ];
  }
  if (driverId) where.driverId = String(driverId);
  if (active !== undefined) where.active = active === 'true';
  // נהג רואה רק את הרכבים שלו
  if (req.user.role === 'DRIVER') {
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    where.driverId = driver?.id ?? '__none__';
  }
  const vehicles = await prisma.vehicle.findMany({
    where,
    include: { driver: true, _count: { select: { documents: true, expenses: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(vehicles);
});

vehiclesRouter.get('/:id', async (req, res) => {
  const v = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    include: {
      driver: true,
      documents: { orderBy: { expiry: 'asc' } },
      expenses: { orderBy: { date: 'desc' }, take: 30 },
      mileages: { orderBy: { date: 'desc' }, take: 30 },
      alerts: { where: { acknowledged: false }, orderBy: { fireAt: 'asc' } },
    },
  });
  if (!v) return res.status(404).json({ error: ERR.NOT_FOUND });
  res.json(v);
});

vehiclesRouter.post('/', async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION, details: parsed.error.flatten() });
  try {
    const v = await prisma.vehicle.create({ data: parsed.data });
    res.status(201).json(v);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: ERR.PLATE_EXISTS });
    throw e;
  }
});

vehiclesRouter.put('/:id', async (req, res) => {
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION, details: parsed.error.flatten() });
  try {
    const v = await prisma.vehicle.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(v);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e;
  }
});

vehiclesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e;
  }
});
