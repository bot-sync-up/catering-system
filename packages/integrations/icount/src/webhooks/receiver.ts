/**
 * Webhook receiver
 * - HMAC-SHA256 signature verification
 * - Express-style middleware (framework-agnostic)
 * - Routes events to registered handlers
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { WebhookEventType, WebhookPayload } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('webhooks');

export type WebhookHandler = (payload: WebhookPayload) => Promise<void> | void;

export interface WebhookReceiverOptions {
  secret: string;
  signatureHeader?: string;
  algorithm?: 'sha256' | 'sha512';
  toleranceSeconds?: number;
}

export class WebhookReceiver {
  private handlers = new Map<WebhookEventType, WebhookHandler[]>();
  private readonly opts: Required<WebhookReceiverOptions>;

  constructor(opts: WebhookReceiverOptions) {
    if (!opts.secret) {
      throw new Error('Webhook secret is required');
    }
    this.opts = {
      secret: opts.secret,
      signatureHeader: opts.signatureHeader ?? 'x-icount-signature',
      algorithm: opts.algorithm ?? 'sha256',
      toleranceSeconds: opts.toleranceSeconds ?? 300,
    };
  }

  on(event: WebhookEventType, handler: WebhookHandler): void {
    const arr = this.handlers.get(event) ?? [];
    arr.push(handler);
    this.handlers.set(event, arr);
  }

  /**
   * אימות חתימת HMAC עם הגנה מפני timing attacks
   */
  verifySignature(rawBody: string, signature: string): boolean {
    if (!signature) return false;
    const expected = createHmac(this.opts.algorithm, this.opts.secret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expected, 'hex');
    if (sigBuffer.length !== expBuffer.length) return false;
    try {
      return timingSafeEqual(sigBuffer, expBuffer);
    } catch {
      return false;
    }
  }

  /**
   * ניתוח event ובדיקת תקינות + קריאה ל-handlers
   */
  async handle(rawBody: string, signature: string): Promise<{ ok: boolean; eventId: string }> {
    if (!this.verifySignature(rawBody, signature)) {
      log.warn('webhook signature verification failed');
      throw new Error('Invalid signature');
    }

    let parsed: WebhookPayload;
    try {
      parsed = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      throw new Error('Invalid JSON payload');
    }

    if (!parsed.event || !parsed.timestamp) {
      throw new Error('Missing required webhook fields');
    }

    // Anti-replay - בדיקת חלון זמן
    const eventTime = new Date(parsed.timestamp).getTime();
    const now = Date.now();
    if (Math.abs(now - eventTime) > this.opts.toleranceSeconds * 1000) {
      throw new Error('Webhook timestamp out of tolerance window');
    }

    const eventId = parsed.id ?? uuidv4();
    log.info({ eventId, event: parsed.event }, 'webhook received');

    const handlers = this.handlers.get(parsed.event) ?? [];
    for (const handler of handlers) {
      try {
        await handler(parsed);
      } catch (err) {
        log.error({ eventId, err: (err as Error).message }, 'webhook handler error');
        throw err;
      }
    }

    return { ok: true, eventId };
  }

  /**
   * Express middleware factory
   */
  expressMiddleware() {
    return async (
      req: { body: unknown; headers: Record<string, string | string[] | undefined>; rawBody?: string },
      res: { status: (code: number) => { json: (body: unknown) => void } },
    ): Promise<void> => {
      const sigHeader = req.headers[this.opts.signatureHeader];
      const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
      const rawBody = req.rawBody ?? JSON.stringify(req.body);

      try {
        const result = await this.handle(rawBody, signature ?? '');
        res.status(200).json(result);
      } catch (err) {
        const status = (err as Error).message === 'Invalid signature' ? 401 : 400;
        res.status(status).json({ ok: false, error: (err as Error).message });
      }
    };
  }
}
