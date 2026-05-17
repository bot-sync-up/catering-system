const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const prisma = require('../../db/prisma');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { ApiError } = require('../../middleware/error');
const { runOcrOnFile } = require('../ocr/service');

const router = express.Router();
router.use(requireAuth);

const uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'reimbursements');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

const createSchema = z.object({
  amount: z.number().positive(),
  description: z.string(),
  expenseDate: z.string(),
  coaId: z.string(),
});

// User creates a request
router.post('/', upload.single('receipt'), async (req, res) => {
  const body = typeof req.body.payload === 'string' ? JSON.parse(req.body.payload) : req.body;
  const data = createSchema.parse({ ...body, amount: Number(body.amount) });
  let ocrData = null;
  let receiptUrl = null;
  if (req.file) {
    receiptUrl = `/uploads/reimbursements/${req.file.filename}`;
    try { ocrData = await runOcrOnFile(req.file.path); } catch (e) { /* ignore */ }
  }
  const r = await prisma.reimbursement.create({
    data: {
      userId: req.user.id,
      amount: data.amount,
      description: data.description,
      expenseDate: new Date(data.expenseDate),
      coaId: data.coaId,
      receiptUrl,
      ocrData,
      status: 'PENDING',
    },
  });
  res.status(201).json(r);
});

router.get('/', async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  // non-admins see only their own
  if (!['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(req.user.role)) {
    where.userId = req.user.id;
  } else if (req.query.userId) {
    where.userId = req.query.userId;
  }
  const list = await prisma.reimbursement.findMany({
    where,
    include: { coa: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

router.get('/:id', async (req, res) => {
  const r = await prisma.reimbursement.findUnique({
    where: { id: req.params.id },
    include: { coa: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!r) throw new ApiError(404, 'לא נמצא', 'NOT_FOUND');
  res.json(r);
});

router.post('/:id/approve', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  const r = await prisma.reimbursement.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED', approverId: req.user.id, approvedAt: new Date() },
  });
  res.json(r);
});

router.post('/:id/reject', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  const { reason } = req.body;
  const r = await prisma.reimbursement.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', approverId: req.user.id, rejectionNote: reason || null },
  });
  res.json(r);
});

router.post('/:id/pay', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const reimb = await prisma.reimbursement.findUnique({ where: { id: req.params.id } });
  if (!reimb) throw new ApiError(404, 'לא נמצא', 'NOT_FOUND');
  if (reimb.status !== 'APPROVED') throw new ApiError(400, 'ניתן לסמן כשולם רק לאחר אישור', 'BAD_STATE');

  const [updated, expense] = await prisma.$transaction([
    prisma.reimbursement.update({
      where: { id: reimb.id },
      data: { status: 'PAID', paidAt: new Date() },
    }),
    prisma.expense.create({
      data: {
        amount: reimb.amount,
        description: `[החזר הוצאה] ${reimb.description}`,
        expenseDate: reimb.expenseDate,
        coaId: reimb.coaId,
        userId: reimb.userId,
        source: 'REIMBURSEMENT',
        status: 'PAID',
        invoiceUrl: reimb.receiptUrl,
        ocrData: reimb.ocrData,
      },
    }),
  ]);
  res.json({ reimbursement: updated, expense });
});

module.exports = router;
