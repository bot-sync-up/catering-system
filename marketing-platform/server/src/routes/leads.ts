import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { updateLeadSegments } from '../services/segmentation.js';
import { recordUtmTouch } from '../services/attribution.js';

export const leadsRouter = Router();

leadsRouter.use(authRequired);

leadsRouter.get('/', async (req, res) => {
  const take = Math.min(Number(req.query.take ?? 50), 200);
  const skip = Number(req.query.skip ?? 0);
  const q = req.query.q as string | undefined;
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { phone: { contains: q } },
          { firstName: { contains: q, mode: 'insensitive' as const } },
          { lastName: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.lead.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
    prisma.lead.count({ where }),
  ]);
  res.json({ items, total });
});

leadsRouter.post('/', async (req, res) => {
  const body = z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    language: z.string().default('he'),
    consentEmail: z.boolean().default(false),
    consentSms: z.boolean().default(false),
    consentWa: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    attributes: z.record(z.any()).default({}),
    source: z.string().optional(),
    utm: z.object({
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmTerm: z.string().optional(),
      utmContent: z.string().optional(),
      referrer: z.string().optional(),
      landingPage: z.string().optional(),
    }).optional(),
  }).parse(req.body);

  const lead = await prisma.lead.create({
    data: {
      email: body.email,
      phone: body.phone,
      firstName: body.firstName,
      lastName: body.lastName,
      language: body.language,
      consentEmail: body.consentEmail,
      consentSms: body.consentSms,
      consentWa: body.consentWa,
      tags: body.tags,
      attributes: body.attributes,
      source: body.source,
    },
  });
  if (body.utm) await recordUtmTouch({ leadId: lead.id, ...body.utm });
  await updateLeadSegments(lead.id).catch(() => null);
  res.status(201).json(lead);
});

leadsRouter.get('/:id', async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: { utmTouches: { orderBy: { createdAt: 'desc' }, take: 50 }, sends: { take: 50 } },
  });
  if (!lead) return res.status(404).json({ error: 'not_found' });
  res.json(lead);
});

leadsRouter.patch('/:id', async (req, res) => {
  const body = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    status: z.string().optional(),
    score: z.number().optional(),
    tags: z.array(z.string()).optional(),
    attributes: z.record(z.any()).optional(),
    consentEmail: z.boolean().optional(),
    consentSms: z.boolean().optional(),
    consentWa: z.boolean().optional(),
  }).parse(req.body);
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: body as any });
  await updateLeadSegments(lead.id).catch(() => null);
  res.json(lead);
});

leadsRouter.post('/:id/event', async (req, res) => {
  const body = z.object({ type: z.string(), value: z.any().optional() }).parse(req.body);
  const ev = await prisma.leadEvent.create({ data: { leadId: req.params.id, type: body.type, value: body.value } });
  await updateLeadSegments(req.params.id).catch(() => null);
  res.json(ev);
});
