import crypto from 'crypto';

/**
 * Handle SendGrid event webhooks: delivered / bounce / open / click /
 * unsubscribe / spamreport / dropped / deferred.
 *
 * SendGrid signs requests with Ed25519 using your "Signed Event Webhook"
 * public key (configured in Mail Settings → Event Webhook). Always verify
 * before trusting the payload.
 */

export type SendGridEventType =
  | 'processed'
  | 'deferred'
  | 'delivered'
  | 'open'
  | 'click'
  | 'bounce'
  | 'dropped'
  | 'spamreport'
  | 'unsubscribe'
  | 'group_unsubscribe'
  | 'group_resubscribe';

export interface SendGridEvent {
  email: string;
  timestamp: number;
  event: SendGridEventType;
  sg_message_id?: string;
  reason?: string;
  url?: string; // for "click"
  /** Custom args (we attach tenantId/userId at send time). */
  tenantId?: string;
  userId?: string;
}

export interface SendGridEventHandlers {
  onDelivered?: (e: SendGridEvent) => Promise<void> | void;
  onBounced?: (e: SendGridEvent) => Promise<void> | void;
  onOpened?: (e: SendGridEvent) => Promise<void> | void;
  onClicked?: (e: SendGridEvent) => Promise<void> | void;
  onUnsubscribed?: (e: SendGridEvent) => Promise<void> | void;
  onSpamReport?: (e: SendGridEvent) => Promise<void> | void;
  onDropped?: (e: SendGridEvent) => Promise<void> | void;
}

export class SendGridEventReceiver {
  /**
   * @param publicKey  Base64-encoded Ed25519 public key from SendGrid settings.
   *                   Pass empty string to disable verification (NOT for prod).
   */
  constructor(private readonly publicKey: string, private readonly handlers: SendGridEventHandlers) {}

  /**
   * Verify and dispatch a SendGrid webhook POST.
   * `rawBody` MUST be the unmodified request body buffer.
   */
  async handle(
    rawBody: Buffer,
    signature: string | undefined,
    timestamp: string | undefined,
  ): Promise<{ ok: boolean; status: number; reason?: string }> {
    if (this.publicKey) {
      if (!signature || !timestamp) return { ok: false, status: 401, reason: 'missing_headers' };
      if (!this.verify(rawBody, signature, timestamp)) {
        return { ok: false, status: 401, reason: 'invalid_signature' };
      }
    }
    let events: SendGridEvent[];
    try {
      events = JSON.parse(rawBody.toString('utf8')) as SendGridEvent[];
    } catch {
      return { ok: false, status: 400, reason: 'invalid_json' };
    }
    for (const e of events) await this.dispatch(e);
    return { ok: true, status: 200 };
  }

  private verify(rawBody: Buffer, signatureBase64: string, timestamp: string): boolean {
    try {
      const sig = Buffer.from(signatureBase64, 'base64');
      const key = Buffer.from(this.publicKey, 'base64');
      const data = Buffer.concat([Buffer.from(timestamp), rawBody]);
      // Convert raw 32-byte Ed25519 public key into DER SPKI for crypto.verify().
      const der = ed25519RawToSpki(key);
      const keyObj = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
      return crypto.verify(null, data, keyObj, sig);
    } catch {
      return false;
    }
  }

  private async dispatch(e: SendGridEvent) {
    switch (e.event) {
      case 'delivered':
        await this.handlers.onDelivered?.(e);
        break;
      case 'bounce':
        await this.handlers.onBounced?.(e);
        break;
      case 'open':
        await this.handlers.onOpened?.(e);
        break;
      case 'click':
        await this.handlers.onClicked?.(e);
        break;
      case 'unsubscribe':
      case 'group_unsubscribe':
        await this.handlers.onUnsubscribed?.(e);
        break;
      case 'spamreport':
        await this.handlers.onSpamReport?.(e);
        break;
      case 'dropped':
        await this.handlers.onDropped?.(e);
        break;
      default:
        break;
    }
  }
}

/** Wrap a 32-byte raw Ed25519 public key in DER SPKI envelope. */
function ed25519RawToSpki(raw: Buffer): Buffer {
  const prefix = Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]);
  return Buffer.concat([prefix, raw]);
}
