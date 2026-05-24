import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ReportType, ReportFormat } from '@prisma/client';
import { runReport } from '../../../lib/reportRunner';

const Body = z.object({
  type: z.nativeEnum(ReportType),
  format: z.nativeEnum(ReportFormat).default('JSON'),
  from: z.string(),
  to: z.string(),
  agentId: z.string().optional(),
  customerId: z.string().optional(),
  category: z.string().optional(),
  officialOnly: z.boolean().optional(),
  year: z.number().optional(),
});

/**
 * POST /api/reports/run
 * Runs a report synchronously and streams the artifact.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { type, format, from, to, agentId, customerId, category, officialOnly, year } = parsed.data;

  try {
    const out = await runReport({
      type, format,
      filter: {
        from: new Date(from),
        to: new Date(to),
        agentId, customerId, category, officialOnly,
      },
      year,
    });
    if (format === 'JSON') {
      return res.status(200).json(out.data);
    }
    res.setHeader('Content-Type', out.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    return res.status(200).send(out.buffer);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export const config = { api: { responseLimit: false } };
