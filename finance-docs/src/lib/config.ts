import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  vatRate: Number(process.env.VAT_RATE ?? 0.17),
  freezeOverdueDays: Number(process.env.FREEZE_OVERDUE_DAYS ?? 60),
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'noreply@example.com',
  },
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID ?? '',
    token: process.env.TWILIO_AUTH_TOKEN ?? '',
    smsFrom: process.env.TWILIO_SMS_FROM ?? '',
    waFrom: process.env.TWILIO_WHATSAPP_FROM ?? '',
  },
};
