import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { listFlags, upsertFlag, deleteFlag } from '../../../lib/featureFlags';

const FlagBody = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  rolloutPercent: z.number().int().min(0).max(100),
  targetRoles: z.array(z.nativeEnum(Role)),
  description: z.string().optional(),
});

/**
 * Feature Flag admin endpoint.
 *   GET    -> list all flags
 *   PUT    -> upsert a flag
 *   DELETE -> remove a flag (?key=)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return res.json(await listFlags());
    case 'PUT': {
      const parsed = FlagBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const f = await upsertFlag(parsed.data);
      return res.json(f);
    }
    case 'DELETE': {
      const key = String(req.query.key ?? '');
      if (!key) return res.status(400).json({ error: 'key required' });
      await deleteFlag(key);
      return res.status(204).end();
    }
    default:
      res.setHeader('Allow', 'GET, PUT, DELETE');
      return res.status(405).end();
  }
}
