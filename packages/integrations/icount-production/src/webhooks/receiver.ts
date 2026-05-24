/**
 * webhooks/receiver.ts — מקלט webhooks מ-iCount
 *
 * iCount שולח webhooks באמצעות Cloud-Auth signature:
 *   - HMAC-SHA256 על body עם secret משותף
 *   - חתימה ב-header: X-iCount-Signature
 *
 * הקובץ:
 *   - מאמת חתימה (anti-replay + constant-time compare)
 *   - מבצע parsing ל-WebhookEvent
 *   - ממפה ל-events פנימיים
 *   - תומך ב-Express middleware ובהפעלה ישירה
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { WebhookEvent, WebhookEventSchema, Logger } from '../types';

export type WebhookHandler = (event: WebhookEvent) => Promise<void> | void;

export interface WebhookReceiverOptions {
  secret: string;
  signatureHeader?: string;     // default X-iCount-Signature
  timestampHeader?: string;     // default X-iCount-Timestamp
  toleranceSeconds?: number;    // default 300 (5 min)
  logger?: Logger;
}

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookSignatureError';
  }
}

export class WebhookReceiver {
  private readonly secret: string;
  private readonly sigHeader: string;
  private readonly tsHeader: string;
  private readonly tolerance: number;
  private readonly logger?: Logger;
  private readonly handlers = new Map<string, WebhookHandler[]>();

  constructor(opts: WebhookReceiverOptions) {
    if (!opts.secret) throw new Error('WebhookReceiver: secret required');
    this.secret = opts.secret;
    this.sigHeader = (opts.signatureHeader ?? 'X-iCount-Signature').toLowerCase();
    this.tsHeader = (opts.timestampHeader ?? 'X-iCount-Timestamp').toLowerCase();
    this.tolerance = opts.toleranceSeconds ?? 300;
    this.logger = opts.logger;
  }

  /**
   * רישום handler לסוג event מסוים
   */
  on(eventType: WebhookEvent['type'] | '*', handler: WebhookHandler): void {
    const arr = this.handlers.get(eventType) ?? [];
    arr.push(handler);
    this.handlers.set(eventType, arr);
  }

  /**
   * אימות חתימה — Cloud-Auth style
   * חתימה חוקית = HMAC-SHA256(secret, `${timestamp}.${body}`)
   */
  verifySignature(rawBody: string, signature: string, timestamp?: string): boolean {
    if (!signature) return false;

    // Replay protection
    if (timestamp) {
      const ts = parseInt(timestamp, 10);
      if (Number.isNaN(ts)) return false;
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > this.tolerance) {
        this.logger?.warn('[Webhook] signature timestamp out of tolerance', {
          ts, now, tolerance: this.tolerance,
        });
        return false;
      }
    }

    const signedPayload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
    const expected = createHmac('sha256', this.secret).update(signedPayload).digest('hex');

    // strip optional "sha256=" prefix
    const cleanSig = signature.replace(/^sha256=/, '');

    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(cleanSig, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /**
   * עיבוד payload — אימות + parsing + מיפוי + dispatch
   */
  async process(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEvent> {
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      lower[k.toLowerCase()] = Array.isArray(v) ? v[0] : (v ?? '');
    }

    const signature = lower[this.sigHeader];
    const timestamp = lower[this.tsHeader];

    if (!this.verifySignature(rawBody, signature, timestamp)) {
      throw new WebhookSignatureError('Invalid webhook signature');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new Error('Invalid JSON in webhook body');
    }

    const event = WebhookEventSchema.parse(parsed) as WebhookEvent;
    this.logger?.info('[Webhook] received', { id: event.id, type: event.type });

    await this.dispatch(event);

    return event;
  }

  private async dispatch(event: WebhookEvent): Promise<void> {
    const specific = this.handlers.get(event.type) ?? [];
    const wildcard = this.handlers.get('*') ?? [];
    for (const h of [...specific, ...wildcard]) {
      try {
        await h(event);
      } catch (e) {
        this.logger?.error('[Webhook] handler failed', {
          id: event.id, type: event.type, err: (e as Error).message,
        });
      }
    }
  }

  /**
   * Express-style middleware
   */
  middleware() {
    return async (req: any, res: any, next: any) => {
      try {
        const raw = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body);
        const event = await this.process(raw, req.headers);
        (req as any).webhookEvent = event;
        res.status(200).json({ status: 'ok', id: event.id });
      } catch (e) {
        if (e instanceof WebhookSignatureError) {
          res.status(401).json({ error: 'invalid_signature' });
          return;
        }
        next?.(e);
      }
    };
  }
}
