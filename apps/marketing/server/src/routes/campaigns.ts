import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { launchCampaign, resolveAbWinner } from '../services/campaignRunner.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const campaignsRouter = Router();
campaignsRouter.use(authRequired);

campaignsRouter.get('/', async (_req, res) => {
  const items = await prisma.campaign.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { variants: true, segment: true },
  });
  res.json({ items });
});

campaignsRouter.post('/', async (req: AuthedRequest, res) => {
  const body = z.object({
    name: z.string(),
    description: z.string().optional(),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']),
    segmentId: z.string().optional(),
    scheduledAt: z.string().datetime().optional(),
    goal: z.string().optional(),
    budget: z.number().default(0),
    abConfig: z.any().default({}),
    variants: z.array(z.object({
      templateId: z.string(),
      label: z.string().default('A'),
      weight: z.number().default(50),
    })),
  }).parse(req.body);

  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      description: body.description,
      channel: body.channel,
      segmentId: body.segmentId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      goal: body.goal,
      budget: body.budget,
      abConfig: body.abConfig,
      createdById: req.user!.id,
      variants: { create: body.variants },
    },
    include: { variants: true },
  });
  res.status(201).json(campaign);
});

campaignsRouter.get('/:id', async (req, res) => {
  const c = await prisma.campaign.findUnique({
    where: { id: req.params.id },
    include: { variants: { include: { template: true } }, segment: true },
  });
  if (!c) return res.status(404).json({ error: 'not_found' });
  res.json(c);
});

campaignsRouter.post('/:id/launch', async (req, res) => {
  const out = await launchCampaign(req.params.id);
  res.json(out);
});

campaignsRouter.post('/:id/pause', async (req, res) => {
  const c = await prisma.campaign.update({ where: { id: req.params.id }, data: { status: 'PAUSED' } });
  res.json(c);
});

campaignsRouter.post('/:id/resume', async (req, res) => {
  const c = await prisma.campaign.update({ where: { id: req.params.id }, data: { status: 'RUNNING' } });
  res.json(c);
});

campaignsRouter.post('/:id/resolve-ab', async (req, res) => {
  res.json(await resolveAbWinner(req.params.id));
});

campaignsRouter.get('/:id/metrics', async (req, res) => {
  const id = req.params.id;
  const [total, sent, opened, clicked, converted, bounced, unsub] = await Promise.all([
    prisma.messageSend.count({ where: { campaignId: id } }),
    prisma.messageSend.count({ where: { campaignId: id, sentAt: { not: null } } }),
    prisma.messageSend.count({ where: { campaignId: id, openedAt: { not: null } } }),
    prisma.messageSend.count({ where: { campaignId: id, clickedAt: { not: null } } }),
    prisma.messageSend.count({ where: { campaignId: id, convertedAt: { not: null } } }),
    prisma.messageSend.count({ where: { campaignId: id, bouncedAt: { not: null } } }),
    prisma.messageSend.count({ where: { campaignId: id, unsubscribedAt: { not: null } } }),
  ]);
  res.json({
    total, sent, opened, clicked, converted, bounced, unsub,
    openRate: sent ? opened / sent : 0,
    clickRate: sent ? clicked / sent : 0,
    convRate: sent ? converted / sent : 0,
    bounceRate: sent ? bounced / sent : 0,
  });
});
