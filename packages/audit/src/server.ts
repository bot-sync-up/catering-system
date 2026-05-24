import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { jwtMiddleware } from './auth/jwt';
import { auditContextMiddleware } from './middleware/auditContext';
import { makeAuthRouter } from './api/authRoutes';
import { makeAuditRouter } from './api/auditRoutes';

export function buildApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1); // honour X-Forwarded-For (one hop)
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  // Order matters: JWT first, then audit context (so it can read req.user).
  app.use(jwtMiddleware);
  app.use(auditContextMiddleware);

  app.use('/api/auth', makeAuthRouter());
  app.use('/api/audit', makeAuditRouter());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Final error guard — never leak internals to the client.
  app.use((err: Error, _req: express.Request, res: express.Response, _n: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[server]', err);
    res.status(500).json({ error: 'internal' });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 4000);
  buildApp().listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`audit-log server listening on :${port}`);
  });
}
