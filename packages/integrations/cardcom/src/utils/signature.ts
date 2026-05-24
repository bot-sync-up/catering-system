import crypto from 'crypto';

/**
 * HMAC-SHA256 signature helper for verifying webhook payloads.
 * CardCom signs `${terminalId}.${lowProfileId}.${amount}` with the shared secret.
 */
export function computeSignature(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

export function verifySignature(
  secret: string,
  payload: string,
  signature: string
): boolean {
  const expected = computeSignature(secret, payload);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
