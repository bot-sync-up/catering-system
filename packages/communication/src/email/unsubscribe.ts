import crypto from 'crypto';

/**
 * Unsubscribe token = HMAC over (userId|tenantId|channel|ts).
 *
 * The HMAC secret must be loaded from env / KMS — never hard-code it.
 * Tokens are URL-safe base64 and embed their own expiry, so the landing
 * page can verify without a DB lookup.
 */
export interface UnsubscribeTokenInput {
  userId: string;
  tenantId: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  /** Token lifetime in seconds. Default: 365 days. */
  ttlSeconds?: number;
}

export interface UnsubscribeTokenPayload extends Omit<UnsubscribeTokenInput, 'ttlSeconds'> {
  /** Issued-at epoch seconds. */
  iat: number;
  /** Expiry epoch seconds. */
  exp: number;
}

export class UnsubscribeTokenService {
  constructor(private readonly secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error('UnsubscribeTokenService requires a >=32-byte HMAC secret');
    }
  }

  issue(input: UnsubscribeTokenInput): string {
    const ttl = input.ttlSeconds ?? 60 * 60 * 24 * 365;
    const iat = Math.floor(Date.now() / 1000);
    const payload: UnsubscribeTokenPayload = {
      userId: input.userId,
      tenantId: input.tenantId,
      channel: input.channel,
      iat,
      exp: iat + ttl,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', this.secret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  verify(token: string): UnsubscribeTokenPayload {
    const [body, sig] = token.split('.');
    if (!body || !sig) throw new Error('Malformed unsubscribe token');
    const expectedSig = crypto.createHmac('sha256', this.secret).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new Error('Invalid unsubscribe signature');
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as UnsubscribeTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Unsubscribe token expired');
    return payload;
  }

  /** Build the canonical unsubscribe URL. */
  buildUrl(baseUrl: string, input: UnsubscribeTokenInput): string {
    const token = this.issue(input);
    const u = new URL('/unsubscribe', baseUrl);
    u.searchParams.set('t', token);
    return u.toString();
  }
}

/**
 * Minimal Express-compatible handler for the unsubscribe landing page.
 * Calls `revoke(payload)` (caller-provided) to flip the consent ledger.
 */
export function createUnsubscribeHandler(
  service: UnsubscribeTokenService,
  revoke: (p: UnsubscribeTokenPayload) => Promise<void>,
) {
  return async function unsubscribeHandler(
    req: { query: { t?: string } },
    res: {
      status: (n: number) => { send: (b: string) => void };
      send: (b: string) => void;
    },
  ) {
    const token = req.query?.t;
    if (!token) return res.status(400).send('Missing token');
    try {
      const payload = service.verify(token);
      await revoke(payload);
      return res.send(
        '<!doctype html><html dir="rtl" lang="he"><body style="font-family:sans-serif;text-align:center;padding:40px">' +
          '<h1>הוסרת בהצלחה</h1>' +
          '<p>לא תקבל יותר הודעות בערוץ זה. תודה שעדכנת אותנו.</p>' +
          '</body></html>',
      );
    } catch (e) {
      return res.status(400).send(`Invalid token: ${(e as Error).message}`);
    }
  };
}
