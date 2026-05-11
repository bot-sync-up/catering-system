import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';

export const surveysRouter = Router();

// Public response endpoint (no auth — usually opened from email link)
surveysRouter.post('/respond', async (req, res) => {
  const body = z.object({
    surveyId: z.string(),
    leadId: z.string(),
    score: z.number().min(0).max(10).optional(),
    comment: z.string().optional(),
  }).parse(req.body);

  const category =
    body.score === undefined ? undefined :
    body.score >= 9 ? 'PROMOTER' :
    body.score >= 7 ? 'PASSIVE' : 'DETRACTOR';

  const r = await prisma.surveyResponse.create({
    data: { ...body, category: category as any },
  });
  res.json(r);
});

surveysRouter.use(authRequired);

surveysRouter.get('/', async (_req, res) => {
  res.json({ items: await prisma.survey.findMany({ orderBy: { updatedAt: 'desc' } }) });
});

surveysRouter.post('/', async (req, res) => {
  const body = z.object({
    name: z.string(),
    type: z.enum(['NPS', 'CSAT', 'CES', 'CUSTOM']).default('NPS'),
    question: z.string(),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']).default('EMAIL'),
    trigger: z.any().default({}),
    active: z.boolean().default(true),
  }).parse(req.body);
  res.status(201).json(await prisma.survey.create({ data: body as any }));
});

surveysRouter.get('/:id/results', async (req, res) => {
  const responses = await prisma.surveyResponse.findMany({ where: { surveyId: req.params.id } });
  const total = responses.length;
  const promoters = responses.filter((r) => r.category === 'PROMOTER').length;
  const passives = responses.filter((r) => r.category === 'PASSIVE').length;
  const detractors = responses.filter((r) => r.category === 'DETRACTOR').length;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
  const avg = total > 0 ? responses.reduce((s, r) => s + (r.score ?? 0), 0) / total : 0;
  res.json({ total, promoters, passives, detractors, nps, avgScore: avg });
});
