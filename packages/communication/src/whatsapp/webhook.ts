import crypto from 'crypto';

/**
 * Meta WhatsApp webhook receiver.
 *
 * Two surfaces:
 *   1. GET /webhook with hub.mode=subscribe + hub.verify_token — used once
 *      during app setup. We just echo hub.challenge if the token matches.
 *   2. POST /webhook with the live event payload (messages + statuses).
 *
 * Meta signs POST bodies with X-Hub-Signature-256 — `verifySignature()`
 * validates it against your App Secret.
 */

export interface WhatsAppWebhookConfig {
  /** Token chosen by you, configured in the Meta dashboard. */
  verifyToken: string;
  /** App secret (used for X-Hub-Signature-256 HMAC validation). */
  appSecret: string;
}

export interface InboundWhatsAppMessage {
  from: string;
  messageId: string;
  timestamp: string;
  type: string;
  /** Free-form text. */
  text?: string;
  /** Button reply (interactive). */
  buttonId?: string;
  /** List reply. */
  listItemId?: string;
  /** Raw object for advanced handlers. */
  raw: unknown;
}

export interface WhatsAppStatusUpdate {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipientId: string;
  errors?: { code: number; title: string; message?: string }[];
}

export interface WhatsAppWebhookHandlers {
  onMessage?: (m: InboundWhatsAppMessage) => Promise<void> | void;
  onStatus?: (s: WhatsAppStatusUpdate) => Promise<void> | void;
}

export class WhatsAppWebhook {
  constructor(private readonly config: WhatsAppWebhookConfig, private readonly handlers: WhatsAppWebhookHandlers) {}

  /** Express-style GET handler for one-time verification. */
  handleVerify(req: { query: Record<string, string | undefined> }, res: {
    status: (n: number) => { send: (b: string) => void };
    send: (b: string) => void;
  }) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === this.config.verifyToken && challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('forbidden');
  }

  /** Express-style POST handler. `rawBody` must be the unparsed buffer. */
  async handleEvent(
    rawBody: Buffer,
    signatureHeader: string | undefined,
    parsedBody: unknown,
  ): Promise<{ ok: boolean; status: number; reason?: string }> {
    if (!signatureHeader || !this.verifySignature(rawBody, signatureHeader)) {
      return { ok: false, status: 401, reason: 'invalid_signature' };
    }
    const body = parsedBody as {
      entry?: { changes?: { value?: WhatsAppValue }[] }[];
    };
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        await this.dispatch(change.value);
      }
    }
    return { ok: true, status: 200 };
  }

  /** Constant-time HMAC validation. */
  private verifySignature(rawBody: Buffer, signatureHeader: string): boolean {
    const expected = 'sha256=' + crypto.createHmac('sha256', this.config.appSecret).update(rawBody).digest('hex');
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  private async dispatch(value?: WhatsAppValue) {
    if (!value) return;
    if (value.messages?.length) {
      for (const m of value.messages) {
        const inbound: InboundWhatsAppMessage = {
          from: m.from,
          messageId: m.id,
          timestamp: m.timestamp,
          type: m.type,
          text: m.text?.body,
          buttonId: m.interactive?.button_reply?.id,
          listItemId: m.interactive?.list_reply?.id,
          raw: m,
        };
        await this.handlers.onMessage?.(inbound);
      }
    }
    if (value.statuses?.length) {
      for (const s of value.statuses) {
        await this.handlers.onStatus?.({
          messageId: s.id,
          status: s.status,
          timestamp: s.timestamp,
          recipientId: s.recipient_id,
          errors: s.errors,
        });
      }
    }
  }
}

// ---- Meta webhook payload shapes (trimmed to what we use) ----------- //
interface WhatsAppValue {
  messages?: {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body: string };
    interactive?: {
      button_reply?: { id: string; title: string };
      list_reply?: { id: string; title: string };
    };
  }[];
  statuses?: {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
    errors?: { code: number; title: string; message?: string }[];
  }[];
}
