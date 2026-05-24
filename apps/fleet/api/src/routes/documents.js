import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { upload, fileUrl } from '../middleware/upload.js';
import { scheduleAlertsForDocument } from '../services/alerts.js';
import { ERR } from '../utils/hebrew.js';

export const docsRouter = Router();
docsRouter.use(authRequired);

const schema = z.object({
  vehicleId: z.string(),
  type: z.enum(['TEST', 'INSURANCE_MANDATORY', 'INSURANCE_COMPREHENSIVE', 'LICENSE', 'LICENSE_DRIVER']),
  expiry: z.string(),
  issueDate: z.string().optional(),
  amount: z.coerce.number().optional(),
  vendor: z.string().optional(),
  policyNo: z.string().optional(),
  notes: z.string().optional(),
});

docsRouter.get('/', async (req, res) => {
  const { vehicleId, expiring } = req.query;
  const where = {};
  if (vehicleId) where.vehicleId = String(vehicleId);
  if (expiring === 'true') {
    const in60 = new Date();
    in60.setDate(in60.getDate() + 60);
    where.expiry = { lte: in60 };
  }
  const docs = await prisma.vehicleDocument.findMany({
    where,
    include: { vehicle: { select: { plate: true, make: true, model: true } } },
    orderBy: { expiry: 'asc' },
  });
  res.json(docs);
});

docsRouter.post('/', upload.single('file'), async (req, res) => {
  // multer puts text fields in req.body
  const body = { ...req.body };
  const parsed = schema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION, details: parsed.error.flatten() });
  const data = {
    vehicleId: parsed.data.vehicleId,
    type: parsed.data.type,
    expiry: new Date(parsed.data.expiry),
    issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
    amount: parsed.data.amount,
    vendor: parsed.data.vendor,
    policyNo: parsed.data.policyNo,
    notes: parsed.data.notes,
    fileUrl: req.file ? fileUrl(req, req.file.filename) : null,
  };
  const doc = await prisma.vehicleDocument.create({ data });
  await scheduleAlertsForDocument(doc);
  res.status(201).json(doc);
});

docsRouter.put('/:id', upload.single('file'), async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: ERR.VALIDATION });
  const data = { ...parsed.data };
  if (data.expiry) data.expiry = new Date(data.expiry);
  if (data.issueDate) data.issueDate = new Date(data.issueDate);
  if (req.file) data.fileUrl = fileUrl(req, req.file.filename);
  try {
    const doc = await prisma.vehicleDocument.update({ where: { id: req.params.id }, data });
    await scheduleAlertsForDocument(doc);
    res.json(doc);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e;
  }
});

docsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.vehicleDocument.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: ERR.NOT_FOUND });
    throw e;
  }
});
