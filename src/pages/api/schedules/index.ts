import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ReportType, ReportFormat } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { syncSchedules } from '../../../jobs/scheduler';

const Body = z.object({
  type: z.nativeEnum(ReportType),
  cron: z.string(),
  params: z.record(z.any()),
  recipients: z.array(z.string().email()),
  format: z.nativeEnum(ReportFormat).default('XLSX'),
  enabled: z.boolean().default(true),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return res.json(await prisma.scheduledReport.findMany({ orderBy: { createdAt: 'desc' } }));
    case 'POST': {
      const parsed = Body.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const created = await prisma.scheduledReport.create({ data: parsed.data });
      await syncSchedules();
      return res.status(201).json(created);
    }
    case 'DELETE': {
      const id = String(req.query.id ?? '');
      if (!id) return res.status(400).json({ error: 'id required' });
      await prisma.scheduledReport.delete({ where: { id } });
      await syncSchedules();
      return res.status(204).end();
    }
    default:
      res.setHeader('Allow', 'GET, POST, DELETE');
      return res.status(405).end();
  }
}
