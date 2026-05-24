import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired, type AuthedRequest } from '../middleware/auth.js';

export const ticketsRouter = Router();
ticketsRouter.use(authRequired);

ticketsRouter.get('/', async (req, res) => {
  const status = req.query.status as string | undefined;
  const assigned = req.query.assigned as string | undefined;
  const items = await prisma.ticket.findMany({
    where: {
      status: status as any,
      assignedToId: assigned === 'me' ? (req as AuthedRequest).user!.id : assigned,
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    include: { lead: true, assignedTo: true },
    take: 100,
  });
  res.json({ items });
});

ticketsRouter.post('/', async (req: AuthedRequest, res) => {
  const body = z.object({
    leadId: z.string().optional(),
    subject: z.string(),
    description: z.string(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']).optional(),
    tags: z.array(z.string()).default([]),
  }).parse(req.body);
  const t = await prisma.ticket.create({ data: body as any });
  res.status(201).json(t);
});

ticketsRouter.get('/:id', async (req, res) => {
  const t = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: { lead: true, comments: { include: { author: true }, orderBy: { createdAt: 'asc' } }, assignedTo: true },
  });
  if (!t) return res.status(404).json({ error: 'not_found' });
  res.json(t);
});

ticketsRouter.patch('/:id', async (req, res) => {
  const body = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
    assignedToId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }).parse(req.body);
  const update: any = { ...body };
  if (body.status === 'RESOLVED') update.resolvedAt = new Date();
  const t = await prisma.ticket.update({ where: { id: req.params.id }, data: update });
  res.json(t);
});

ticketsRouter.post('/:id/comments', async (req: AuthedRequest, res) => {
  const body = z.object({ body: z.string(), internal: z.boolean().default(false) }).parse(req.body);
  const c = await prisma.ticketComment.create({
    data: { ticketId: req.params.id, authorId: req.user!.id, body: body.body, internal: body.internal },
  });
  res.status(201).json(c);
});
