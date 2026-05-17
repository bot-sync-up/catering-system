import { Router } from 'express';
import { z } from 'zod';
import { paymentService } from '../../services/payments.js';
import { authMiddleware, requirePermission, type AuthedReq } from '../auth.js';

export const paymentsRouter = Router();
paymentsRouter.use(authMiddleware);

const Schema = z.object({
  documentId: z.string(),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'CHECK', 'POSTDATED_CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER']),
  reference: z.string().optional(),
  paidAt: z.coerce.date().optional(),
  checkId: z.string().optional(),
  notes: z.string().optional(),
});

paymentsRouter.post('/', requirePermission('payment.record'), async (req: AuthedReq, res) => {
  const body = Schema.parse(req.body);
  const p = await paymentService.record(body);
  res.status(201).json(p);
});
