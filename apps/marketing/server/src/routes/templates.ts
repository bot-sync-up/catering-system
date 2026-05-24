import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';

export const templatesRouter = Router();
templatesRouter.use(authRequired);

templatesRouter.get('/', async (_req, res) => {
  res.json({ items: await prisma.template.findMany({ orderBy: { updatedAt: 'desc' } }) });
});

templatesRouter.post('/', async (req, res) => {
  const body = z.object({
    name: z.string(),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']),
    subject: z.string().optional(),
    body: z.string(),
    design: z.any().optional(),
    variables: z.any().default([]),
  }).parse(req.body);
  const t = await prisma.template.create({ data: body as any });
  res.status(201).json(t);
});

templatesRouter.put('/:id', async (req, res) => {
  const body = z.object({
    name: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    design: z.any().optional(),
    variables: z.any().optional(),
  }).parse(req.body);
  const t = await prisma.template.update({ where: { id: req.params.id }, data: body });
  res.json(t);
});

templatesRouter.delete('/:id', async (req, res) => {
  await prisma.template.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
