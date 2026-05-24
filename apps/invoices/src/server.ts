// finance-docs HTTP server.
import express from 'express';
import helmet from 'helmet';
import { config } from './lib/config.js';
import { documentsRouter } from './api/routes/documents.js';
import { paymentsRouter } from './api/routes/payments.js';
import { customersRouter } from './api/routes/customers.js';
import { checksRouter } from './api/routes/checks.js';
import { agingRouter } from './api/routes/aging.js';
import { remindersRouter } from './api/routes/reminders.js';
import { renderDashboard } from './ui/pages/dashboard.js';

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '2mb' }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// API
app.use('/api/documents', documentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/checks', checksRouter);
app.use('/api/aging', agingRouter);
app.use('/api/reminders', remindersRouter);

// UI (RTL Hebrew SSR shell)
app.get('/', (_req, res) => res.type('html').send(renderDashboard()));

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(err.status ?? 400).json({ error: err.message ?? 'error' });
});

app.listen(config.port, () => {
  console.log(`finance-docs listening on :${config.port}`);
});
