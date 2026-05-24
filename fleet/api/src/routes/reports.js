import { Router } from 'express';
import { prisma } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { generateMonthlyReport, generateAnnualReport, generateMileageTaxReport } from '../pdf/reports.js';

export const reportsRouter = Router();
reportsRouter.use(authRequired);

// דוח חודשי — PDF
reportsRouter.get('/monthly.pdf', async (req, res) => {
  const { vehicleId, year, month } = req.query;
  if (!vehicleId || !year || !month) return res.status(400).json({ error: 'חסרים פרמטרים: vehicleId, year, month' });
  const y = Number(year), m = Number(month);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: String(vehicleId) }, include: { driver: true } });
  if (!vehicle) return res.status(404).json({ error: 'רכב לא נמצא' });
  const expenses = await prisma.vehicleExpense.findMany({
    where: { vehicleId: vehicle.id, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });
  const mileages = await prisma.mileage.findMany({
    where: { vehicleId: vehicle.id, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="monthly-${vehicle.plate}-${y}-${m}.pdf"`);
  generateMonthlyReport(res, { vehicle, year: y, month: m, expenses, mileages });
});

// דוח שנתי — PDF
reportsRouter.get('/annual.pdf', async (req, res) => {
  const { vehicleId, year } = req.query;
  if (!vehicleId || !year) return res.status(400).json({ error: 'חסרים פרמטרים' });
  const y = Number(year);
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31, 23, 59, 59);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: String(vehicleId) }, include: { driver: true } });
  if (!vehicle) return res.status(404).json({ error: 'רכב לא נמצא' });
  const expenses = await prisma.vehicleExpense.findMany({
    where: { vehicleId: vehicle.id, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });
  const mileages = await prisma.mileage.findMany({
    where: { vehicleId: vehicle.id, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="annual-${vehicle.plate}-${y}.pdf"`);
  generateAnnualReport(res, { vehicle, year: y, expenses, mileages });
});

// דוח נסועה למס — PDF
reportsRouter.get('/mileage-tax.pdf', async (req, res) => {
  const { vehicleId, year } = req.query;
  if (!year) return res.status(400).json({ error: 'יש לציין שנה' });
  const y = Number(year);
  const where = {
    date: { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) },
  };
  if (vehicleId) where.vehicleId = String(vehicleId);
  const vehicle = vehicleId ? await prisma.vehicle.findUnique({ where: { id: String(vehicleId) }, include: { driver: true } }) : null;
  const mileages = await prisma.mileage.findMany({
    where,
    include: { vehicle: { select: { plate: true, make: true, model: true } } },
    orderBy: { date: 'asc' },
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="mileage-tax-${y}.pdf"`);
  generateMileageTaxReport(res, { year: y, vehicle, mileages });
});
