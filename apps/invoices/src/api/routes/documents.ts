import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/db.js';
import { documentService } from '../../services/documents.js';
import { customerService } from '../../services/customers.js';
import { reminderService } from '../../services/reminders.js';
import { renderDocumentPdf } from '../../templates/pdf.js';
import { authMiddleware, requirePermission, type AuthedReq } from '../auth.js';

export const documentsRouter = Router();
documentsRouter.use(authMiddleware);

const ItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().min(0).max(1).optional(),
  vatRate: z.number().min(0).max(1).optional(),
});

const InstallmentSchema = z.object({
  seq: z.number().int().positive(),
  dueDate: z.coerce.date(),
  percent: z.number().min(0).max(1).optional(),
  amount: z.number().nonnegative().optional(),
});

const CreateSchema = z.object({
  customerId: z.string(),
  type: z.enum(['QUOTE', 'ORDER', 'PO', 'PROFORMA', 'TAX_INVOICE', 'TAX_INVOICE_RECEIPT', 'RECEIPT', 'CREDIT_NOTE']),
  tag: z.enum(['OFFICIAL', 'UNOFFICIAL']).optional(),
  items: z.array(ItemSchema).min(1),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  installments: z.array(InstallmentSchema).optional(),
  vatRate: z.number().min(0).max(1).optional(),
});

documentsRouter.post('/', requirePermission('doc.create'), async (req: AuthedReq, res) => {
  const body = CreateSchema.parse(req.body);
  // Block FROZEN customers from receiving new orders.
  if (['ORDER', 'PROFORMA', 'TAX_INVOICE', 'TAX_INVOICE_RECEIPT'].includes(body.type)) {
    await customerService.assertCanOrder(body.customerId);
  }
  const doc = await documentService.create({ orgId: req.user!.orgId, ...body });
  res.status(201).json(doc);
});

documentsRouter.get('/', requirePermission('doc.read'), async (req: AuthedReq, res) => {
  const { status, type, customerId } = req.query;
  const docs = await prisma.document.findMany({
    where: {
      orgId: req.user!.orgId,
      ...(status ? { status: status as any } : {}),
      ...(type ? { type: type as any } : {}),
      ...(customerId ? { customerId: customerId as string } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(docs);
});

documentsRouter.get('/:id', requirePermission('doc.read'), async (req: AuthedReq, res) => {
  const doc = await prisma.document.findFirstOrThrow({
    where: { id: req.params.id, orgId: req.user!.orgId },
    include: { items: true, installments: true, payments: true, reminders: true, customer: true },
  });
  res.json(doc);
});

documentsRouter.post('/:id/issue', requirePermission('doc.issue'), async (req: AuthedReq, res) => {
  const doc = await documentService.issue(req.params.id);
  // Auto-schedule reminders on issue.
  if (doc.dueDate) {
    await reminderService.scheduleForDocument(doc.id, 'EMAIL');
  }
  res.json(doc);
});

documentsRouter.post('/:id/convert', requirePermission('doc.create'), async (req: AuthedReq, res) => {
  const Schema = z.object({ toType: z.enum(['ORDER', 'PROFORMA', 'TAX_INVOICE', 'TAX_INVOICE_RECEIPT', 'RECEIPT']) });
  const { toType } = Schema.parse(req.body);
  const newDoc = await documentService.convert(req.params.id, toType);
  res.status(201).json(newDoc);
});

documentsRouter.post('/:id/cancel', requirePermission('doc.cancel'), async (req: AuthedReq, res) => {
  res.json(await documentService.cancel(req.params.id));
});

documentsRouter.post('/:id/credit', requirePermission('doc.credit'), async (req: AuthedReq, res) => {
  const credit = await documentService.credit(req.params.id, req.body?.items);
  res.status(201).json(credit);
});

documentsRouter.get('/:id/pdf', requirePermission('doc.read'), async (req: AuthedReq, res) => {
  const doc = await prisma.document.findFirstOrThrow({
    where: { id: req.params.id, orgId: req.user!.orgId },
    include: { items: true, installments: true, customer: true, org: true },
  });
  const pdf = await renderDocumentPdf({ doc, org: doc.org, customer: doc.customer });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${doc.number}.pdf"`);
  res.end(pdf);
});
