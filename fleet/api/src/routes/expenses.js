import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { upload, fileUrl } from '../middleware/upload.js';
import { ERR } from '../utils/hebrew.js';

export const expensesRouter = Router();
expensesRouter.use(authRequired);

const schema = z.object({
  vehicleId: z.string(),
  type: z.enum(['FUEL', 'SERVICE', 'REPAIR', 'FINE', 'PARKING', 'TOLL', 'WASH', 'OTHER']),
  date: z.string(),
  amount: z.coerce.number(),
  liters: z.coerce.number().optional(),
  pricePerLiter: z.coerce.number().optional(),
  mileage: z.coerce.number().int().optional(),
  vendor: z.string().optional(),
  description: z.string().optional(),
});

expensesRouter.get('/', async (req, res) => {
  const { vehicleId, type, from, to } = req.query;
  const where = {};
  if (vehicleId) where.vehicleId = String(vehicleId);
  if (type) where.type = String(type);
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(String(from));
    if (to) where.date.lte = new Date(String(to));
  }
  // נהג רואה רק הוצאות לרכבים שלו
  if (req.user.role === 'DRIVER') {
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    const myVehicles = await prisma.vehicle.findMany({
      where: { driverId: driver?.id ?? '__none__' },
      select: { id: true },
    });
    where.vehicleId = { in: myVehicles.map((v) => v.id) };
  }
  const list = await prisma.vehicleExpense.findMany({
    where,
    include: { vehicle: { select: { plate: true, make: true, model: true } } },
    orderBy: { date: 'desc' },
    take: 500,
  });
  res.json(list);
});

expensesRouter.post('/', upload.single('receipt'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION, details: parsed.error.flatten() });
  const data = {
    ...parsed.data,
    date: new Date(parsed.data.date),
    receiptUrl: req.file ? fileUrl(req, req.file.filename) : null,
    createdBy: req.user.id,
  };
  const e = await prisma.vehicleExpense.create({ data });
  // עדכון קילומטראז' עדכני אם דווח
  if (data.mileage) {
    await prisma.vehicle.update({
      where: { id: data.vehicleId },
      data: { currentKm: Math.max(data.mileage, 0) },
    });
  }
  res.status(201).json(e);
});

expensesRouter.put('/:id', upload.single('receipt'), async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION });
  const data = { ...parsed.data };
  if (data.date) data.date = new Date(data.date);
  if (req.file) data.receiptUrl = fileUrl(req, req.file.filename);
  try {
    const e = await prisma.vehicleExpense.update({ where: { id: req.params.id }, data });
    res.json(e);
  } catch (e2) {
    if (e2.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e2;
  }
});

expensesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.vehicleExpense.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e;
  }
});

// סיכומים
expensesRouter.get('/summary', async (req, res) => {
  const { vehicleId, year } = req.query;
  const where = {};
  if (vehicleId) where.vehicleId = String(vehicleId);
  if (year) {
    where.date = {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31T23:59:59`),
    };
  }
  const rows = await prisma.vehicleExpense.groupBy({
    by: ['type'],
    where,
    _sum: { amount: true, liters: true },
    _count: { _all: true },
  });
  res.json(rows);
});
