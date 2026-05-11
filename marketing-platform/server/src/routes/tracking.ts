import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { recordUtmTouch } from '../services/attribution.js';

export const trackingRouter = Router();

const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/** Email open tracking: 1x1 transparent gif */
trackingRouter.get('/open/:sendId.gif', async (req, res) => {
  try {
    await prisma.messageSend.update({
      where: { id: req.params.sendId },
      data: { openedAt: new Date(), status: 'OPENED' },
    });
  } catch {/* ignore */}
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(PIXEL_GIF);
});

/** Click tracking with redirect */
trackingRouter.get('/click/:sendId/:url', async (req, res) => {
  let url: string;
  try {
    url = Buffer.from(req.params.url, 'base64url').toString('utf8');
  } catch {
    return res.status(400).send('bad url');
  }
  try {
    await prisma.messageSend.update({
      where: { id: req.params.sendId },
      data: { clickedAt: new Date(), status: 'CLICKED' },
    });
    const send = await prisma.messageSend.findUnique({ where: { id: req.params.sendId } });
    if (send) {
      await prisma.leadEvent.create({
        data: { leadId: send.leadId, type: 'email_click', value: { url, sendId: send.id } },
      });
    }
  } catch {/* ignore */}
  res.redirect(302, url);
});

/** Unsubscribe link */
trackingRouter.get('/unsub/:sendId', async (req, res) => {
  try {
    const send = await prisma.messageSend.findUnique({ where: { id: req.params.sendId } });
    if (send) {
      await prisma.messageSend.update({ where: { id: send.id }, data: { unsubscribedAt: new Date(), status: 'UNSUBSCRIBED' } });
      await prisma.lead.update({
        where: { id: send.leadId },
        data: { consentEmail: false, status: 'UNSUBSCRIBED' },
      });
    }
  } catch {/* ignore */}
  res.send(`<!DOCTYPE html><html lang="he" dir="rtl"><meta charset="utf-8"><body style="font-family:Arial;text-align:center;padding:48px;">
    <h1>הוסרת בהצלחה</h1><p>כתובת האימייל שלך הוסרה מרשימת התפוצה.</p></body></html>`);
});

/** UTM ingestion endpoint (no auth — client-side beacon) */
trackingRouter.post('/utm', async (req, res) => {
  const { leadId, ...rest } = req.body ?? {};
  if (!leadId) return res.status(400).json({ error: 'leadId required' });
  await recordUtmTouch({ leadId, ...rest });
  res.json({ ok: true });
});

/** SendGrid event webhook */
trackingRouter.post('/webhook/sendgrid', async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [];
  for (const e of events) {
    const sendId = e.sendId ?? e.customArgs?.sendId;
    if (!sendId) continue;
    const data: any = {};
    if (e.event === 'delivered') { data.deliveredAt = new Date(e.timestamp * 1000); data.status = 'DELIVERED'; }
    if (e.event === 'open') { data.openedAt = new Date(e.timestamp * 1000); data.status = 'OPENED'; }
    if (e.event === 'click') { data.clickedAt = new Date(e.timestamp * 1000); data.status = 'CLICKED'; }
    if (e.event === 'bounce') { data.bouncedAt = new Date(e.timestamp * 1000); data.status = 'BOUNCED'; }
    if (e.event === 'unsubscribe') { data.unsubscribedAt = new Date(e.timestamp * 1000); data.status = 'UNSUBSCRIBED'; }
    if (Object.keys(data).length > 0) await prisma.messageSend.update({ where: { id: sendId }, data }).catch(() => null);
  }
  res.json({ ok: true });
});
