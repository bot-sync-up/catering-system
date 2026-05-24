import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { campaignRoi } from '../services/attribution.js';

export const reportsRouter = Router();
reportsRouter.use(authRequired);

reportsRouter.get('/kpi', async (req, res) => {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 86400_000);
  const to = req.query.to ? new Date(req.query.to as string) : new Date();

  const [totalLeads, newLeads, totalSends, openSum, clickSum, convSum, openTickets, npsResp] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.messageSend.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.messageSend.count({ where: { createdAt: { gte: from, lte: to }, openedAt: { not: null } } }),
    prisma.messageSend.count({ where: { createdAt: { gte: from, lte: to }, clickedAt: { not: null } } }),
    prisma.messageSend.count({ where: { createdAt: { gte: from, lte: to }, convertedAt: { not: null } } }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.surveyResponse.findMany({ where: { createdAt: { gte: from, lte: to } } }),
  ]);

  const promoters = npsResp.filter((r) => r.category === 'PROMOTER').length;
  const detractors = npsResp.filter((r) => r.category === 'DETRACTOR').length;
  const npsTotal = npsResp.length;
  const nps = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : 0;

  res.json({
    totalLeads, newLeads,
    totalSends,
    openRate: totalSends ? openSum / totalSends : 0,
    clickRate: totalSends ? clickSum / totalSends : 0,
    convRate: totalSends ? convSum / totalSends : 0,
    openTickets,
    nps, npsResponses: npsTotal,
  });
});

reportsRouter.get('/roi', async (req, res) => {
  const utmCampaign = req.query.utmCampaign as string | undefined;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  res.json(await campaignRoi({ utmCampaign, from, to }));
});

reportsRouter.get('/timeline', async (req, res) => {
  // Sends per day for the last 30 days
  const since = new Date(Date.now() - 30 * 86400_000);
  const rows = await prisma.$queryRaw<Array<{ day: Date; sent: bigint; opened: bigint; clicked: bigint }>>`
    SELECT date_trunc('day', "createdAt") AS day,
           COUNT(*)::bigint AS sent,
           COUNT(*) FILTER (WHERE "openedAt" IS NOT NULL)::bigint AS opened,
           COUNT(*) FILTER (WHERE "clickedAt" IS NOT NULL)::bigint AS clicked
      FROM "MessageSend"
     WHERE "createdAt" >= ${since}
  GROUP BY day
  ORDER BY day ASC`;
  res.json({ items: rows.map((r) => ({ day: r.day, sent: Number(r.sent), opened: Number(r.opened), clicked: Number(r.clicked) })) });
});
