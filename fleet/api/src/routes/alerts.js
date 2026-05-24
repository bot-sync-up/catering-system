import { Router } from 'express';
import { prisma } from '../db.js';
import { authRequired } from '../middleware/auth.js';

export const alertsRouter = Router();
alertsRouter.use(authRequired);

alertsRouter.get('/', async (req, res) => {
  const { vehicleId, ack } = req.query;
  const where = {};
  if (vehicleId) where.vehicleId = String(vehicleId);
  if (ack === 'false') where.acknowledged = false;
  if (ack === 'true') where.acknowledged = true;
  const list = await prisma.alert.findMany({
    where,
    include: {
      vehicle: { select: { plate: true, make: true, model: true } },
      document: { select: { type: true, expiry: true } },
    },
    orderBy: { fireAt: 'asc' },
    take: 200,
  });
  res.json(list);
});

alertsRouter.post('/:id/ack', async (req, res) => {
  await prisma.alert.update({ where: { id: req.params.id }, data: { acknowledged: true } });
  res.json({ ok: true });
});
