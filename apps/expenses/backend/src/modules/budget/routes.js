const express = require('express');
const { z } = require('zod');
const prisma = require('../../db/prisma');
const { requireAuth } = require('../../middleware/auth');
const { budgetVsActual, checkVariance, getAlerts } = require('./service');

const router = express.Router();
router.use(requireAuth);

const schema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12).nullable().optional(),
  coaId: z.string(),
  amount: z.number(),
  notes: z.string().optional(),
});

router.get('/', async (req, res) => {
  const year = parseInt(req.query.year || new Date().getFullYear());
  const list = await prisma.budget.findMany({
    where: { year },
    include: { coa: true },
    orderBy: [{ coa: { code: 'asc' } }, { month: 'asc' }],
  });
  res.json(list);
});

router.post('/', async (req, res) => {
  const data = schema.parse({ ...req.body, amount: Number(req.body.amount) });
  const item = await prisma.budget.upsert({
    where: {
      year_month_coaId: {
        year: data.year,
        month: data.month ?? null,
        coaId: data.coaId,
      },
    },
    update: { amount: data.amount, notes: data.notes },
    create: data,
  });
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const data = schema.partial().parse({
    ...req.body,
    amount: req.body.amount !== undefined ? Number(req.body.amount) : undefined,
  });
  const item = await prisma.budget.update({ where: { id: req.params.id }, data });
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  await prisma.budget.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Budget vs Actual report
router.get('/vs-actual', async (req, res) => {
  const year = parseInt(req.query.year || new Date().getFullYear());
  const month = req.query.month ? parseInt(req.query.month) : null;
  const result = await budgetVsActual(year, month);
  res.json(result);
});

// Recompute alerts
router.post('/check-variance', async (req, res) => {
  const { year, month, coaId } = req.body;
  const result = await checkVariance(year, month, coaId);
  res.json(result);
});

// Alerts
router.get('/alerts', async (req, res) => {
  const items = await getAlerts(req.query);
  res.json(items);
});

router.put('/alerts/:id/ack', async (req, res) => {
  const item = await prisma.varianceAlert.update({
    where: { id: req.params.id },
    data: { acknowledged: true },
  });
  res.json(item);
});

module.exports = router;
