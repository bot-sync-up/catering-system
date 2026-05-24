import { Router, Request, Response } from 'express';
import { validateBody } from '../middleware/validate';
import { ApproveAndBillInput, CancelEventInput, NewEventOrderInput } from '../types/dto';
import { runNewEventOrder } from '../workflows/new-event-order';
import { runApproveAndBill } from '../workflows/approve-and-bill';
import { runCancelEvent } from '../workflows/cancel-event';
import { getRun, listRuns } from '../lib/state';

export const orchestrateRouter = Router();

orchestrateRouter.post(
  '/new-event-order',
  validateBody(NewEventOrderInput),
  async (req: Request, res: Response) => {
    const input = (req as Request & { validated: typeof NewEventOrderInput._type }).validated;
    const { run, result } = await runNewEventOrder(input);
    res.status(result.ok ? 201 : 500).json({ run, result });
  },
);

orchestrateRouter.post(
  '/approve-and-bill',
  validateBody(ApproveAndBillInput),
  async (req: Request, res: Response) => {
    const input = (req as Request & { validated: typeof ApproveAndBillInput._type }).validated;
    const { run, result } = await runApproveAndBill(input);
    res.status(result.ok ? 200 : 402).json({ run, result });
  },
);

orchestrateRouter.post(
  '/cancel-event',
  validateBody(CancelEventInput),
  async (req: Request, res: Response) => {
    const input = (req as Request & { validated: typeof CancelEventInput._type }).validated;
    const { run, result } = await runCancelEvent(input);
    res.status(result.ok ? 200 : 500).json({ run, result });
  },
);

orchestrateRouter.get('/runs', (_req, res) => {
  res.json({ runs: listRuns() });
});

orchestrateRouter.get('/runs/:id', (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'not_found' });
  res.json({ run });
});
