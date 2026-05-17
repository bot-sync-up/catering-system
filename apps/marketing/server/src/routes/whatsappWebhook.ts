import { Router } from 'express';
import { env } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { chatTurn, getOrCreateConversation } from '../services/chatbot.js';
import { sendWaText } from '../services/whatsapp.js';
import { logger } from '../lib/logger.js';

export const waWebhookRouter = Router();

// Verification step (GET) per Meta docs
waWebhookRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(String(challenge));
  } else {
    res.sendStatus(403);
  }
});

// Incoming events (POST)
waWebhookRouter.post('/', async (req, res) => {
  res.sendStatus(200); // ack immediately
  try {
    const entries = req.body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const ch of changes) {
        const value = ch.value;
        // Status updates (sent/delivered/read)
        if (value?.statuses) {
          for (const s of value.statuses) {
            const data: any = {};
            if (s.status === 'delivered') { data.deliveredAt = new Date(); data.status = 'DELIVERED'; }
            if (s.status === 'read') { data.openedAt = new Date(); data.status = 'OPENED'; }
            if (s.status === 'failed') { data.status = 'FAILED'; data.errorMessage = JSON.stringify(s.errors ?? []); }
            await prisma.messageSend.updateMany({ where: { providerMessageId: s.id }, data });
          }
        }
        // Inbound messages → chatbot
        if (value?.messages) {
          for (const m of value.messages) {
            const phone = m.from as string;
            const text = m.text?.body as string | undefined;
            if (!text) continue;
            // Find/create lead by phone
            let lead = await prisma.lead.findFirst({ where: { phone: { contains: phone.slice(-9) } } });
            if (!lead) {
              lead = await prisma.lead.create({
                data: { phone: `+${phone}`, consentWa: true, source: 'whatsapp' },
              });
            }
            const conv = await getOrCreateConversation({
              channel: 'WHATSAPP',
              externalId: phone,
              leadId: lead.id,
            });
            const result = await chatTurn({
              conversationId: conv.id,
              userMessage: text,
              leadId: lead.id,
            });
            await sendWaText({ to: phone, body: result.reply });
          }
        }
      }
    }
  } catch (err) {
    logger.error('wa webhook error', err);
  }
});
