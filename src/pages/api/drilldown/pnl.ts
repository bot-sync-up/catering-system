import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { pnlDrillDown } from '../../../lib/aggregations/pnl';

const Q = z.object({
  from: z.string(),
  to: z.string(),
  agentId: z.string().optional(),
  customerId: z.string().optional(),
  category: z.string().optional(),
  officialOnly: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const q = parsed.data;
  const result = await pnlDrillDown({
    from: new Date(q.from),
    to: new Date(q.to),
    agentId: q.agentId,
    customerId: q.customerId,
    category: q.category,
    officialOnly: q.officialOnly === 'true',
  });
  res.json(result);
}
