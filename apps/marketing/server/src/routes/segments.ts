import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { evaluateSegment, previewSegment } from '../services/segmentation.js';

export const segmentsRouter = Router();
segmentsRouter.use(authRequired);

segmentsRouter.get('/', async (_req, res) => {
  const items = await prisma.segment.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json({ items });
});

segmentsRouter.post('/', async (req, res) => {
  const body = z.object({
    name: z.string(),
    description: z.string().optional(),
    type: z.enum(['DYNAMIC', 'STATIC']).default('DYNAMIC'),
    rules: z.any(),
  }).parse(req.body);
  const seg = await prisma.segment.create({ data: body as any });
  res.status(201).json(seg);
});

segmentsRouter.put('/:id', async (req, res) => {
  const body = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    rules: z.any().optional(),
  }).parse(req.body);
  const seg = await prisma.segment.update({ where: { id: req.params.id }, data: body });
  res.json(seg);
});

segmentsRouter.post('/preview', async (req, res) => {
  const out = await previewSegment(req.body.rules);
  res.json(out);
});

segmentsRouter.post('/:id/evaluate', async (req, res) => {
  const out = await evaluateSegment(req.params.id);
  res.json(out);
});

segmentsRouter.get('/:id/members', async (req, res) => {
  const members = await prisma.segmentMember.findMany({
    where: { segmentId: req.params.id },
    include: { lead: true },
    take: 200,
  });
  res.json({ items: members.map((m) => m.lead) });
});
