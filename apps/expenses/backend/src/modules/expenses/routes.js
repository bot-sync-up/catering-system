const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const prisma = require('../../db/prisma');
const { requireAuth } = require('../../middleware/auth');
const { ApiError } = require('../../middleware/error');

const router = express.Router();
router.use(requireAuth);

const uploadDir = process.env.UPLOAD_DIR || './uploads';
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: path.join(uploadDir, 'invoices') });

const createSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('ILS'),
  vatAmount: z.number().optional(),
  description: z.string(),
  expenseDate: z.string(),
  invoiceNumber: z.string().optional(),
  coaId: z.string(),
  vendorId: z.string().optional().nullable(),
  source: z.enum(['MANUAL', 'OCR', 'BANK_IMPORT', 'RECURRING', 'PETTY_CASH', 'REIMBURSEMENT']).optional(),
});

router.get('/', async (req, res) => {
  const { from, to, coaId, vendorId, status, source } = req.query;
  const where = {};
  if (from || to) where.expenseDate = {};
  if (from) where.expenseDate.gte = new Date(from);
  if (to) where.expenseDate.lte = new Date(to);
  if (coaId) where.coaId = coaId;
  if (vendorId) where.vendorId = vendorId;
  if (status) where.status = status;
  if (source) where.source = source;

  const items = await prisma.expense.findMany({
    where,
    include: { coa: true, vendor: true, user: { select: { id: true, name: true } } },
    orderBy: { expenseDate: 'desc' },
    take: 500,
  });
  res.json(items);
});

router.get('/summary', async (req, res) => {
  const year = parseInt(req.query.year || new Date().getFullYear());
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const rows = await prisma.expense.findMany({
    where: { expenseDate: { gte: start, lt: end } },
    select: { amount: true, expenseDate: true, coaId: true, coa: { select: { nameHe: true, code: true } } },
  });
  const byMonth = Array.from({ length: 12 }, () => 0);
  const byCoa = {};
  for (const r of rows) {
    const m = new Date(r.expenseDate).getMonth();
    const amt = Number(r.amount);
    byMonth[m] += amt;
    const key = r.coaId;
    if (!byCoa[key]) byCoa[key] = { coaId: key, name: r.coa.nameHe, code: r.coa.code, total: 0 };
    byCoa[key].total += amt;
  }
  res.json({ year, byMonth, byCoa: Object.values(byCoa).sort((a, b) => b.total - a.total) });
});

router.post('/', upload.single('invoice'), async (req, res) => {
  const body = typeof req.body.payload === 'string' ? JSON.parse(req.body.payload) : req.body;
  const data = createSchema.parse({
    ...body,
    amount: Number(body.amount),
    vatAmount: body.vatAmount ? Number(body.vatAmount) : undefined,
  });
  const expense = await prisma.expense.create({
    data: {
      amount: data.amount,
      currency: data.currency,
      vatAmount: data.vatAmount,
      description: data.description,
      expenseDate: new Date(data.expenseDate),
      invoiceNumber: data.invoiceNumber,
      invoiceUrl: req.file ? `/uploads/invoices/${req.file.filename}` : undefined,
      coaId: data.coaId,
      vendorId: data.vendorId || null,
      userId: req.user.id,
      source: data.source || 'MANUAL',
    },
  });

  // trigger variance check (async, don't block)
  const { checkVariance } = require('../budget/service');
  checkVariance(new Date(expense.expenseDate).getFullYear(), new Date(expense.expenseDate).getMonth() + 1, expense.coaId)
    .catch((e) => console.error('[variance]', e.message));

  res.status(201).json(expense);
});

router.put('/:id', async (req, res) => {
  const data = createSchema.partial().parse({
    ...req.body,
    amount: req.body.amount ? Number(req.body.amount) : undefined,
  });
  if (data.expenseDate) data.expenseDate = new Date(data.expenseDate);
  const expense = await prisma.expense.update({ where: { id: req.params.id }, data });
  res.json(expense);
});

router.delete('/:id', async (req, res) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Vendors
router.get('/vendors/list', async (req, res) => {
  const vendors = await prisma.vendor.findMany({ orderBy: { name: 'asc' } });
  res.json(vendors);
});

router.post('/vendors', async (req, res) => {
  const vendor = await prisma.vendor.create({ data: req.body });
  res.status(201).json(vendor);
});

module.exports = router;
