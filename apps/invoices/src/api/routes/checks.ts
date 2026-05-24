import { Router } from 'express';
import { z } from 'zod';
import { checkService } from '../../services/checks.js';
import { authMiddleware, requirePermission, type AuthedReq } from '../auth.js';

export const checksRouter = Router();
checksRouter.use(authMiddleware);

const Schema = z.object({
  customerId: z.string(),
  bank: z.string(),
  branch: z.string().optional(),
  account: z.string().optional(),
  checkNumber: z.string(),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  documentId: z.string().optional(),
  notes: z.string().optional(),
});

checksRouter.post('/', requirePermission('check.manage'), async (req: AuthedReq, res) => {
  res.status(201).json(await checkService.register(Schema.parse(req.body)));
});

checksRouter.get('/upcoming', requirePermission('doc.read'), async (req, res) => {
  const days = Number(req.query.days ?? 7);
  res.json(await checkService.upcoming(days));
});

checksRouter.post('/:id/status', requirePermission('check.manage'), async (req, res) => {
  const S = z.object({ status: z.enum(['PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED']), notes: z.string().optional() });
  const { status, notes } = S.parse(req.body);
  res.json(await checkService.setStatus(req.params.id, status, notes));
});
