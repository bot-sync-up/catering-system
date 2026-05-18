import 'dotenv/config';

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: req('DATABASE_URL', 'postgresql://localhost:5432/marketing'),
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  JWT_SECRET: req('JWT_SECRET', 'dev-secret-change-me'),
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000',

  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ?? '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL ?? 'no-reply@example.com',
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME ?? 'Marketing',

  SMS_019_USER: process.env.SMS_019_USER ?? '',
  SMS_019_PASSWORD: process.env.SMS_019_PASSWORD ?? '',
  SMS_019_SOURCE: process.env.SMS_019_SOURCE ?? 'Marketing',

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? '',
  TWILIO_FROM: process.env.TWILIO_FROM ?? '',

  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN ?? '',
  WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID ?? '',
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ?? 'verify',
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? '',

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  CLAUDE_MODEL: process.env.CLAUDE_MODEL ?? 'claude-opus-4-7',

  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN ?? '',
  META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID ?? '',
  GOOGLE_ADS_DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '',
  GOOGLE_ADS_CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID ?? '',
  GOOGLE_ADS_REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? '',
};
