import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { chatTurn, getOrCreateConversation } from '../services/chatbot.js';

export const chatbotRouter = Router();

// Portal/web chat — public, with optional leadId
chatbotRouter.post('/web', async (req, res) => {
  const body = z.object({
    sessionId: z.string(),
    message: z.string(),
    leadId: z.string().optional(),
  }).parse(req.body);

  const conv = await getOrCreateConversation({
    channel: 'PUSH', // 'web' fits closest to push for portal purposes
    externalId: body.sessionId,
    leadId: body.leadId,
  });
  const result = await chatTurn({
    conversationId: conv.id,
    userMessage: body.message,
    leadId: conv.leadId,
  });
  res.json({ conversationId: conv.id, ...result });
});

// Authenticated admin endpoints below
chatbotRouter.get('/conversations', authRequired, async (_req, res) => {
  const items = await prisma.chatbotConversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: { lead: true },
  });
  res.json({ items });
});

chatbotRouter.get('/conversations/:id', authRequired, async (req, res) => {
  const conv = await prisma.chatbotConversation.findUnique({
    where: { id: req.params.id },
    include: { messages: { orderBy: { createdAt: 'asc' } }, lead: true },
  });
  if (!conv) return res.status(404).json({ error: 'not_found' });
  res.json(conv);
});

// FAQ admin
chatbotRouter.get('/faq', authRequired, async (_req, res) => {
  res.json({ items: await prisma.faqEntry.findMany({ orderBy: { updatedAt: 'desc' } }) });
});

chatbotRouter.post('/faq', authRequired, async (req, res) => {
  const body = z.object({
    category: z.string().optional(),
    question: z.string(),
    answer: z.string(),
    keywords: z.array(z.string()).default([]),
    active: z.boolean().default(true),
  }).parse(req.body);
  res.status(201).json(await prisma.faqEntry.create({ data: body }));
});
