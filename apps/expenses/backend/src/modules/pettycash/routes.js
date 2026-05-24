const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const prisma = require('../../db/prisma');
const { requireAuth } = require('../../middleware/auth');
const { runOcrOnFile } = require('../ocr/service');

const router = express.Router();
router.use(requireAuth);

const uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'receipts');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.get('/', async (req, res) => {
  const list = await prisma.pettyCash.findMany({ where: { isActive: true } });
  res.json(list);
});

router.post('/', async (req, res) => {
  const { name, initialBalance, custodianId } = req.body;
  const p = await prisma.pettyCash.create({
    data: {
      name,
      initialBalance: Number(initialBalance),
      currentBalance: Number(initialBalance),
      custodianId,
    },
  });
  res.status(201).json(p);
});

router.get('/:id/entries', async (req, res) => {
  const entries = await prisma.pettyCashEntry.findMany({
    where: { pettyId: req.params.id },
    include: { coa: true, user: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(entries);
});

const entrySchema = z.object({
  type: z.enum(['OUT', 'IN']),
  amount: z.number().positive(),
  description: z.string(),
  date: z.string(),
  coaId: z.string().optional().nullable(),
});

router.post('/:id/entries', upload.single('receipt'), async (req, res) => {
  const body = typeof req.body.payload === 'string' ? JSON.parse(req.body.payload) : req.body;
  const data = entrySchema.parse({ ...body, amount: Number(body.amount) });
  const petty = await prisma.pettyCash.findUnique({ where: { id: req.params.id } });
  if (!petty) return res.status(404).json({ error: 'NOT_FOUND' });

  let ocrData = null;
  let receiptUrl = null;
  if (req.file) {
    receiptUrl = `/uploads/receipts/${req.file.filename}`;
    try {
      ocrData = await runOcrOnFile(req.file.path);
    } catch (e) {
      console.warn('[petty.ocr]', e.message);
    }
  }

  const sign = data.type === 'OUT' ? -1 : 1;
  const newBalance = Number(petty.currentBalance) + sign * data.amount;

  const [entry] = await prisma.$transaction([
    prisma.pettyCashEntry.create({
      data: {
        pettyId: petty.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        coaId: data.coaId || null,
        receiptUrl,
        ocrData,
        userId: req.user.id,
      },
    }),
    prisma.pettyCash.update({
      where: { id: petty.id },
      data: { currentBalance: newBalance },
    }),
  ]);

  // If OUT entry with coa — mirror as Expense
  if (data.type === 'OUT' && data.coaId) {
    await prisma.expense.create({
      data: {
        amount: data.amount,
        description: `[קופה קטנה] ${data.description}`,
        expenseDate: new Date(data.date),
        coaId: data.coaId,
        userId: req.user.id,
        source: 'PETTY_CASH',
        status: 'RECORDED',
        invoiceUrl: receiptUrl,
        ocrData,
      },
    });
  }

  res.status(201).json(entry);
});

module.exports = router;
