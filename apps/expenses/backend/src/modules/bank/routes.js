const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../../db/prisma');
const { requireAuth } = require('../../middleware/auth');
const { parseStatement, matchTransactions, matchSingle } = require('./service');

const router = express.Router();
router.use(requireAuth);

const uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'bank');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.get('/accounts', async (req, res) => {
  const accounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
  res.json(accounts);
});

router.post('/accounts', async (req, res) => {
  const a = await prisma.bankAccount.create({ data: req.body });
  res.status(201).json(a);
});

router.get('/statements', async (req, res) => {
  const statements = await prisma.bankStatement.findMany({
    include: { bankAccount: true, _count: { select: { transactions: true } } },
    orderBy: { uploadedAt: 'desc' },
  });
  res.json(statements);
});

router.post('/statements/upload', upload.single('file'), async (req, res) => {
  const { bankAccountId } = req.body;
  if (!req.file) return res.status(400).json({ error: 'NO_FILE' });

  const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
  const fileType = ['ofx', 'csv', 'xlsx', 'xls'].includes(ext) ? ext.toUpperCase() : 'UNKNOWN';
  if (fileType === 'UNKNOWN') return res.status(400).json({ error: 'UNSUPPORTED_FORMAT' });

  const transactions = await parseStatement(req.file.path, fileType);
  if (!transactions.length) return res.status(400).json({ error: 'NO_TRANSACTIONS' });

  const dates = transactions.map((t) => new Date(t.txDate)).filter((d) => !isNaN(d));
  const startDate = new Date(Math.min(...dates));
  const endDate = new Date(Math.max(...dates));

  const statement = await prisma.bankStatement.create({
    data: {
      bankAccountId,
      filename: req.file.originalname,
      fileType,
      startDate,
      endDate,
      transactions: {
        create: transactions.map((t) => ({
          txDate: new Date(t.txDate),
          amount: t.amount,
          description: t.description || '',
          reference: t.reference || null,
          balance: t.balance || null,
        })),
      },
    },
    include: { transactions: true },
  });

  // auto-match
  const matchResult = await matchTransactions(statement.id);
  res.status(201).json({ statement, matching: matchResult });
});

router.get('/statements/:id/transactions', async (req, res) => {
  const txs = await prisma.bankTransaction.findMany({
    where: { statementId: req.params.id },
    include: { expense: { include: { coa: true, vendor: true } } },
    orderBy: { txDate: 'desc' },
  });
  res.json(txs);
});

router.post('/transactions/:id/match', async (req, res) => {
  const { expenseId } = req.body;
  const result = await matchSingle(req.params.id, expenseId);
  res.json(result);
});

router.post('/transactions/:id/unmatch', async (req, res) => {
  const tx = await prisma.bankTransaction.findUnique({ where: { id: req.params.id }, include: { expense: true } });
  if (tx?.expense) {
    await prisma.expense.update({
      where: { id: tx.expense.id },
      data: { bankTransactionId: null, reconciled: false },
    });
  }
  await prisma.bankTransaction.update({ where: { id: req.params.id }, data: { matched: false, matchScore: null } });
  res.json({ ok: true });
});

router.get('/unmatched', async (req, res) => {
  const txs = await prisma.bankTransaction.findMany({
    where: { matched: false },
    orderBy: { txDate: 'desc' },
    take: 200,
  });
  res.json(txs);
});

module.exports = router;
