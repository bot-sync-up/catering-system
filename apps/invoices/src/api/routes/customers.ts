import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/db.js';
import { customerService } from '../../services/customers.js';
import { authMiddleware, requirePermission, type AuthedReq } from '../auth.js';

export const customersRouter = Router();
customersRouter.use(authMiddleware);

const Schema = z.object({
  name: z.string(),
  taxId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
});

customersRouter.post('/', requirePermission('customer.manage'), async (req: AuthedReq, res) => {
  const body = Schema.parse(req.body);
  const c = await customerService.create({ orgId: req.user!.orgId, ...body });
  res.status(201).json(c);
});

customersRouter.get('/', requirePermission('doc.read'), async (req: AuthedReq, res) => {
  res.json(await prisma.customer.findMany({
    where: { orgId: req.user!.orgId },
    orderBy: { name: 'asc' },
  }));
});

customersRouter.post('/:id/freeze', requirePermission('customer.freeze'), async (req: AuthedReq, res) => {
  res.json(await customerService.freeze(req.params.id));
});

customersRouter.post('/:id/unfreeze', requirePermission('customer.freeze'), async (req: AuthedReq, res) => {
  res.json(await customerService.unfreeze(req.params.id));
});

customersRouter.get('/:id/outstanding', requirePermission('doc.read'), async (req, res) => {
  res.json({ balance: await customerService.outstanding(req.params.id) });
});
