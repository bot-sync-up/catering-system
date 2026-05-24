const express = require('express');
const { z } = require('zod');
const prisma = require('../../db/prisma');
const { requireAuth } = require('../../middleware/auth');
const { generateForMonth } = require('./service');

const router = express.Router();
router.use(requireAuth);

const schema = z.object({
  name: z.string(),
  category: z.enum([
    'RENT', 'ELECTRICITY', 'WATER', 'GAS', 'INTERNET',
    'CLEANING', 'INSURANCE', 'PHONE', 'ACCOUNTING', 'SALARY', 'OTHER',
  ]),
  amount: z.number().positive(),
  currency: z.string().default('ILS'),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'WEEKLY']).default('MONTHLY'),
  dayOfMonth: z.number().int().min(1).max(28).default(1),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  description: z.string().optional(),
  coaId: z.string(),
  vendorId: z.string().nullable().optional(),
  autoCreate: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

router.get('/', async (req, res) => {
  const items = await prisma.recurringExpense.findMany({
    include: { coa: true, vendor: true, _count: { select: { expenses: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

router.post('/', async (req, res) => {
  const data = schema.parse({ ...req.body, amount: Number(req.body.amount) });
  const item = await prisma.recurringExpense.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const data = schema.partial().parse({
    ...req.body,
    amount: req.body.amount ? Number(req.body.amount) : undefined,
  });
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  const item = await prisma.recurringExpense.update({ where: { id: req.params.id }, data });
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  await prisma.recurringExpense.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Manual trigger to generate expenses for a specific month
router.post('/generate', async (req, res) => {
  const { year, month } = req.body;
  const result = await generateForMonth(year, month);
  res.json(result);
});

module.exports = router;
