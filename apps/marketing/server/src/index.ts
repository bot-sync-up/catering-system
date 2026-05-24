import express from 'express';
import { auditContextMiddleware } from '@catering/audit-enforcement';
import cors from 'cors';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { authRouter } from './routes/auth.js';
import { leadsRouter } from './routes/leads.js';
import { segmentsRouter } from './routes/segments.js';
import { templatesRouter } from './routes/templates.js';
import { campaignsRouter } from './routes/campaigns.js';
import { trackingRouter } from './routes/tracking.js';
import { surveysRouter } from './routes/surveys.js';
import { ticketsRouter } from './routes/tickets.js';
import { reportsRouter } from './routes/reports.js';
import { chatbotRouter } from './routes/chatbot.js';
import { waWebhookRouter } from './routes/whatsappWebhook.js';

const app = express();

app.use(auditContextMiddleware());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/track', trackingRouter);
app.use('/api/surveys', surveysRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/chatbot', chatbotRouter);
app.use('/api/wa/webhook', waWebhookRouter);

// Centralized error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('api error', { msg: err.message, name: err.name });
  if (err.name === 'ZodError') return res.status(400).json({ error: 'validation', details: err.errors });
  res.status(err.status ?? 500).json({ error: err.code ?? 'internal_error', message: err.message });
});

app.listen(env.PORT, () => {
  logger.info(`marketing API listening on :${env.PORT}`);
});
