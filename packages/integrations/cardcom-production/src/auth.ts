/**
 * Cardcom authentication helpers.
 * Cardcom v11 uses ApiName + TerminalNumber (+ optional Password) in payload.
 */
import { CardcomCredentialsSchema, type CardcomCredentials } from './types';

export function validateCredentials(creds: CardcomCredentials): CardcomCredentials {
  return CardcomCredentialsSchema.parse(creds);
}

/**
 * Build the auth payload Cardcom expects merged into every request body.
 */
export function buildAuthPayload(creds: CardcomCredentials): Record<string, string> {
  const payload: Record<string, string> = {
    TerminalNumber: creds.terminalNumber,
    ApiName: creds.apiName,
  };
  if (creds.apiPassword) {
    payload.ApiPassword = creds.apiPassword;
  }
  return payload;
}

/**
 * Redact credentials from a free-form object — useful before logging.
 */
export function redactSecrets<T extends Record<string, unknown>>(obj: T): T {
  const SECRET_KEYS = new Set([
    'ApiPassword',
    'apipassword',
    'apiPassword',
    'password',
    'Token',
    'token',
    'cvv',
    'CVV',
    'cardNumber',
    'CardNumber',
    'pan',
    'PAN',
  ]);

  const clone: Record<string, unknown> = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const k of Object.keys(clone)) {
    if (SECRET_KEYS.has(k)) {
      clone[k] = '***REDACTED***';
    } else if (clone[k] && typeof clone[k] === 'object') {
      clone[k] = redactSecrets(clone[k] as Record<string, unknown>);
    }
  }
  return clone as T;
}
