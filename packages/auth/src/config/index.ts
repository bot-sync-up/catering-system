/**
 * תצורת auth — נטען ממשתני סביבה עם וולידציה
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Crypto
  AES_KEY_HEX: z.string().length(64, 'AES_KEY_HEX must be 32 bytes hex (64 chars)'),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // Argon2id
  ARGON2_MEMORY_COST: z.coerce.number().default(65536), // 64 MiB
  ARGON2_TIME_COST: z.coerce.number().default(3),
  ARGON2_PARALLELISM: z.coerce.number().default(4),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SESSION_TTL_SEC: z.coerce.number().default(60 * 60 * 24 * 7), // 7d

  // Rate limit
  LOGIN_RATE_MAX: z.coerce.number().default(5),
  LOGIN_RATE_WINDOW_SEC: z.coerce.number().default(900), // 15m
  GLOBAL_RATE_MAX: z.coerce.number().default(100),
  GLOBAL_RATE_WINDOW_SEC: z.coerce.number().default(60),

  // Lockout
  LOCKOUT_THRESHOLD: z.coerce.number().default(5),
  LOCKOUT_DURATION_SEC: z.coerce.number().default(900),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  FACEBOOK_CALLBACK_URL: z.string().optional(),

  // SMS (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),

  // App
  APP_NAME: z.string().default('Aneh-HaShoel'),
  APP_BASE_URL: z.string().default('http://localhost:3000'),
});

export type AuthConfig = z.infer<typeof envSchema>;

let cached: AuthConfig | null = null;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  if (cached) return cached;
  // ב-test נספק defaults אם חסרים
  const merged = {
    ...env,
    AES_KEY_HEX: env.AES_KEY_HEX ?? (env.NODE_ENV === 'test' ? '0'.repeat(64) : env.AES_KEY_HEX),
    JWT_SECRET: env.JWT_SECRET ?? (env.NODE_ENV === 'test' ? 'test-secret-test-secret-test-secret!!' : env.JWT_SECRET),
  };
  const parsed = envSchema.safeParse(merged);
  if (!parsed.success) {
    throw new Error(`Invalid auth config: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetConfigCache(): void {
  cached = null;
}
