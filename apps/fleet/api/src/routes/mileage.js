import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { ERR } from '../utils/hebrew.js';

export const mileageRouter = Router();
mileageRouter.use(authRequired);

const schema = z.object({
  vehicleId: z.string(),
  driverId: z.string().optional(),
  date: z.string(),
  startKm: z.coerce.number().int().min(0),
  endKm: z.coerce.number().int().min(0),
  purpose: z.enum(['BUSINESS', 'PRIVATE', 'MIXED']).default('BUSINESS'),
  origin: z.string().optional(),
  destination: z.string().optional(),
  notes: z.string().optional(),
});

mileageRouter.get('/', async (req, res) => {
  const { vehicleId, driverId, from, to, purpose } = req.query;
  const where = {};
  if (vehicleId) where.vehicleId = String(vehicleId);
  if (driverId) where.driverId = String(driverId);
  if (purpose) where.purpose = String(purpose);
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(String(from));
    if (to) where.date.lte = new Date(String(to));
  }
  if (req.user.role === 'DRIVER') {
    const d = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    where.driverId = d?.id ?? '__none__';
  }
  const list = await prisma.mileage.findMany({
    where,
    include: { vehicle: { select: { plate: true } }, driver: { select: { name: true } } },
    orderBy: { date: 'desc' },
    take: 500,
  });
  res.json(list);
});

mileageRouter.post('/', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION, details: parsed.error.flatten() });
  const { startKm, endKm } = parsed.data;
  if (endKm < startKm) {
    return res.status(400).json({ error: 'מד סיום חייב להיות גדול ממד התחלה' });
  }
  // אם נהג — שייך אוטומטית לנהג שלו
  let driverId = parsed.data.driverId;
  if (req.user.role === 'DRIVER') {
    const d = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    driverId = d?.id;
  }
  const m = await prisma.mileage.create({
    data: {
      ...parsed.data,
      driverId,
      date: new Date(parsed.data.date),
      km: endKm - startKm,
    },
  });
  // עדכון currentKm
  await prisma.vehicle.update({
    where: { id: parsed.data.vehicleId },
    data: { currentKm: Math.max(endKm, 0) },
  });
  res.status(201).json(m);
});

mileageRouter.put('/:id', async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION });
  const data = { ...parsed.data };
  if (data.date) data.date = new Date(data.date);
  if (data.startKm !== undefined && data.endKm !== undefined) {
    data.km = data.endKm - data.startKm;
  }
  try {
    const m = await prisma.mileage.update({ where: { id: req.params.id }, data });
    res.json(m);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e;
  }
});

mileageRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.mileage.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e;
  }
});

// סיכום נסועה לפי מטרה — דוח למס
mileageRouter.get('/tax-summary', async (req, res) => {
  const { year, vehicleId } = req.query;
  if (!year) return res.status(400).json({ error: 'יש לציין שנה' });
  const where = {
    date: {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31T23:59:59`),
    },
  };
  if (vehicleId) where.vehicleId = String(vehicleId);
  const all = await prisma.mileage.findMany({ where });
  const summary = { BUSINESS: 0, PRIVATE: 0, MIXED: 0, total: 0 };
  for (const r of all) {
    summary[r.purpose] = (summary[r.purpose] || 0) + r.km;
    summary.total += r.km;
  }
  res.json({ year: Number(year), ...summary, businessKm: summary.BUSINESS });
});
