/**
 * Rate limiting — express-rate-limit עם Redis store (אופציונלי)
 * מספק שני limiters: global ו-login (החמור יותר).
 */
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '../session/store';
import { loadConfig } from '../config';

function makeStore(): RedisStore | undefined {
  try {
    const r = getRedis();
    return new RedisStore({
      sendCommand: (...args: string[]) => r.call(...args) as Promise<unknown>,
    } as ConstructorParameters<typeof RedisStore>[0]);
  } catch {
    return undefined; // נופל ל-memory store כשאין Redis (פיתוח/בדיקות)
  }
}

export function globalLimiter() {
  const cfg = loadConfig();
  return rateLimit({
    windowMs: cfg.GLOBAL_RATE_WINDOW_SEC * 1000,
    max: cfg.GLOBAL_RATE_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeStore(),
    message: { error: 'יותר מדי בקשות, נסה שוב מאוחר יותר' },
  });
}

export function loginLimiter() {
  const cfg = loadConfig();
  return rateLimit({
    windowMs: cfg.LOGIN_RATE_WINDOW_SEC * 1000,
    max: cfg.LOGIN_RATE_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeStore(),
    keyGenerator: (req) => `${req.ip}:${(req.body as { email?: string })?.email ?? ''}`,
    message: { error: 'חרגת ממגבלת ניסיונות התחברות, נסה שוב בעוד 15 דקות' },
  });
}
