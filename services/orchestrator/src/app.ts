import express, { Application, NextFunction, Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { orchestrateRouter } from './routes/orchestrate';

export function createApp(): Application {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'orchestrator' }));

  app.use('/api/orchestrate', orchestrateRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err: err.message, stack: err.stack }, 'unhandled error');
    res.status(500).json({ error: 'internal_error', message: err.message });
  });

  return app;
}
