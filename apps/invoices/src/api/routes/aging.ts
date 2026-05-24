import { Router } from 'express';
import { agingReport } from '../../services/aging.js';
import { authMiddleware, requirePermission, type AuthedReq } from '../auth.js';

export const agingRouter = Router();
agingRouter.use(authMiddleware);

agingRouter.get('/', requirePermission('doc.read'), async (req: AuthedReq, res) => {
  const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();
  res.json(await agingReport(req.user!.orgId, asOf));
});
