import pino from 'pino';

export const logger = pino({
  name: 'cardcom',
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'cardNumber',
      'CardNumber',
      'cvv',
      'CVV',
      'apiPassword',
      'ApiPassword',
      'request.cardNumber',
      'request.cvv',
      '*.cardNumber',
      '*.cvv',
    ],
    censor: '[REDACTED]',
  },
});
