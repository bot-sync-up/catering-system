/**
 * Pino logger עם redactions אגרסיביים.
 *
 * שדות נשמרים מסומנים: passwords, tokens, PAN (card), CVV, JWT.
 * הסיבה: גם אם הפיתוח שכח sanitize — לעולם לא ידלוף לפרודקשן.
 */

import pino from "pino";
import type { Logger, LoggerOptions, DestinationStream } from "pino";

/**
 * נתיבי redaction — חוקי JSONPath של Pino.
 * כל מה שמתאים יוחלף ב-"[REDACTED]".
 */
export const redactPaths = [
  // סיסמאות
  "password",
  "*.password",
  "*.*.password",
  "passwordHash",
  "*.passwordHash",
  "currentPassword",
  "newPassword",

  // טוקנים
  "token",
  "*.token",
  "accessToken",
  "*.accessToken",
  "refreshToken",
  "*.refreshToken",
  "apiKey",
  "*.apiKey",
  "api_key",
  "*.api_key",
  "secret",
  "*.secret",
  "clientSecret",
  "*.clientSecret",

  // JWT — בכותרת Authorization
  'req.headers.authorization',
  'req.headers.cookie',
  'request.headers.authorization',
  'request.headers.cookie',
  'res.headers["set-cookie"]',

  // כרטיסי אשראי — PAN/CVV/track
  "card",
  "*.card",
  "cardNumber",
  "*.cardNumber",
  "pan",
  "*.pan",
  "cvv",
  "*.cvv",
  "cvc",
  "*.cvc",
  "cardholderName",

  // ת"ז ופרטים מזהים
  "ssn",
  "*.ssn",
  "nationalId",
  "*.nationalId",

  // OAuth/webhook secrets
  "stripeSecret",
  "twilioAuthToken",
  "webhookSecret",
];

export interface CreateLoggerOptions {
  serviceName: string;
  level?: pino.Level;
  pretty?: boolean;
  /** redactions נוספים מעבר לברירת המחדל */
  extraRedact?: string[];
  destination?: DestinationStream;
}

/**
 * יוצר logger עם הגדרות פרודקשן.
 * ב-dev — מציג pretty colors אם pretty=true.
 */
export function createLogger(opts: CreateLoggerOptions): Logger {
  const isProduction = process.env.NODE_ENV === "production";
  const level =
    opts.level ?? (process.env.LOG_LEVEL as pino.Level) ?? "info";

  const options: LoggerOptions = {
    level,
    base: {
      service: opts.serviceName,
      env: process.env.OTEL_DEPLOYMENT_ENV ?? "development",
      hostname: process.env.HOSTNAME,
      pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: {
      paths: [...redactPaths, ...(opts.extraRedact ?? [])],
      censor: "[REDACTED]",
      remove: false,
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: (req: { id?: string; method?: string; url?: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res: { statusCode?: number }) => ({
        statusCode: res.statusCode,
      }),
    },
  };

  // pretty רק ב-dev — לעולם לא בפרודקשן
  if (opts.pretty && !isProduction) {
    return pino(
      options,
      pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      }),
    );
  }

  return opts.destination ? pino(options, opts.destination) : pino(options);
}

export type { Logger };
