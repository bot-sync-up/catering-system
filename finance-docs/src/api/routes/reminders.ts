import { Router } from 'express';
import { z } from 'zod';
import { reminderService } from '../../services/reminders.js';
import { authMiddleware, requirePermission } from '../auth.js';

export const remindersRouter = Router();
remindersRouter.use(authMiddleware);

remindersRouter.post('/schedule/:documentId', requirePermission('reminder.manage'), async (req, res) => {
  const S = z.object({ channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']).default('EMAIL') });
  const { channel } = S.parse(req.body ?? {});
  res.json(await reminderService.scheduleForDocument(req.params.documentId, channel));
});
