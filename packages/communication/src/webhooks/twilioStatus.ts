import crypto from 'crypto';

/**
 * Handle Twilio SMS status callbacks.
 *
 * Twilio signs requests with X-Twilio-Signature — HMAC-SHA1 over
 * (full URL + sorted form params), base64-encoded.
 *
 * Status values: queued, sent, delivered, undelivered, failed.
 */

export type TwilioStatus = 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';

export interface TwilioStatusEvent {
  messageSid: string;
  messageStatus: TwilioStatus;
  errorCode?: string;
  errorMessage?: string;
  to: string;
  from: string;
}

export interface TwilioStatusHandlers {
  onSent?: (e: TwilioStatusEvent) => Promise<void> | void;
  onDelivered?: (e: TwilioStatusEvent) => Promise<void> | void;
  onFailed?: (e: TwilioStatusEvent) => Promise<void> | void;
}

export class TwilioStatusReceiver {
  constructor(private readonly authToken: string, private readonly handlers: TwilioStatusHandlers) {}

  async handle(
    fullUrl: string,
    formParams: Record<string, string>,
    signatureHeader: string | undefined,
  ): Promise<{ ok: boolean; status: number; reason?: string }> {
    if (!signatureHeader) return { ok: false, status: 401, reason: 'missing_signature' };
    if (!this.verify(fullUrl, formParams, signatureHeader)) {
      return { ok: false, status: 401, reason: 'invalid_signature' };
    }
    const e: TwilioStatusEvent = {
      messageSid: formParams.MessageSid,
      messageStatus: formParams.MessageStatus as TwilioStatus,
      errorCode: formParams.ErrorCode,
      errorMessage: formParams.ErrorMessage,
      to: formParams.To,
      from: formParams.From,
    };
    switch (e.messageStatus) {
      case 'sent':
        await this.handlers.onSent?.(e);
        break;
      case 'delivered':
        await this.handlers.onDelivered?.(e);
        break;
      case 'undelivered':
      case 'failed':
        await this.handlers.onFailed?.(e);
        break;
      default:
        break;
    }
    return { ok: true, status: 200 };
  }

  /**
   * Twilio signature: sort form keys alphabetically, concatenate name+value,
   * append to URL, HMAC-SHA1 with auth token, base64.
   */
  verify(fullUrl: string, params: Record<string, string>, signature: string): boolean {
    const sorted = Object.keys(params).sort();
    const data = fullUrl + sorted.map((k) => k + params[k]).join('');
    const expected = crypto.createHmac('sha1', this.authToken).update(data).digest('base64');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}
