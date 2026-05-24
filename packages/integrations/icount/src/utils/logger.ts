import pino from 'pino';

export const logger = pino({
  name: 'icount-integration',
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'apiKey',
      '*.apiKey',
      'config.apiKey',
      'headers.authorization',
      'headers.Authorization',
      'req.headers.authorization',
      '*.password',
      '*.creditCard',
      '*.cardNumber',
    ],
    censor: '[REDACTED]',
  },
});

export function createLogger(component: string) {
  return logger.child({ component });
}
