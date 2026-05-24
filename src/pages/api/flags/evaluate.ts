import type { NextApiRequest, NextApiResponse } from 'next';
import { Role } from '@prisma/client';
import { isEnabled } from '../../../lib/featureFlags';

/**
 * GET /api/flags/evaluate?key=foo&userId=...&role=ADMIN
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = String(req.query.key ?? '');
  if (!key) return res.status(400).json({ error: 'key required' });
  const userId = req.query.userId ? String(req.query.userId) : undefined;
  const role = req.query.role ? (String(req.query.role) as Role) : undefined;
  const enabled = await isEnabled(key, { userId, role });
  res.json({ key, enabled });
}
