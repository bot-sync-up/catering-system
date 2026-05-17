/**
 * דוגמה לאתחול שרת auth מלא — Express + helmet + rate-limit + routes.
 * שמור כקובץ ייחוס; לא נטען אוטומטית.
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import { securityHeaders } from './middleware/securityHeaders';
import { globalLimiter } from './middleware/rateLimit';
import { buildAuthRouter } from './routes/authRoutes';
import { AuthService } from './services/authService';
import { InMemoryUserRepo } from './db/repository';
import { NoopSender } from './2fa/sms';
import { loadConfig } from './config';

export function buildApp() {
  const cfg = loadConfig();
  const app = express();

  app.set('trust proxy', 1);
  app.use(securityHeaders());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(globalLimiter());

  const repo = new InMemoryUserRepo();
  const svc = new AuthService(repo, new NoopSender());

  app.use('/api/auth', buildAuthRouter(svc, repo));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  return { app, repo, svc, cfg };
}

if (require.main === module) {
  const { app, cfg } = buildApp();
  app.listen(cfg.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`auth server on :${cfg.PORT}`);
  });
}
