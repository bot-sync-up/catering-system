import axios, { AxiosError, AxiosInstance } from 'axios';
import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, Recipient, SendResult } from '../types';

export interface SendGridOptions {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  /** SendGrid template id mapping for our logical template ids. */
  templateMap?: Record<string, string>;
  /** Enable click + open tracking. Default: true. */
  tracking?: { click?: boolean; open?: boolean };
  /** Override base URL (mostly for tests). */
  baseUrl?: string;
}

/**
 * Real SendGrid Web API v3 client.
 *
 * Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
 *
 * Maps our internal Message to SendGrid's "mail/send" payload with full
 * support for dynamic templates, merge fields, attachments, and tracking.
 */
export class SendGridProvider implements IMessageSender {
  readonly channel: Channel = 'email';
  readonly config: ProviderConfig;
  private readonly http: AxiosInstance;
  private readonly opts: SendGridOptions;

  constructor(opts: SendGridOptions, config?: Partial<ProviderConfig>) {
    this.opts = opts;
    this.config = {
      name: 'sendgrid',
      channel: 'email',
      priority: 1,
      estimatedCostAgorot: 2, // ~0.02 ILS / email at scale
      enabled: true,
      ...config,
    };
    this.http = axios.create({
      baseURL: opts.baseUrl ?? 'https://api.sendgrid.com',
      timeout: 15_000,
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async send(message: Message): Promise<SendResult> {
    const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
    const payload = this.buildPayload(message, recipient);

    try {
      const res = await this.http.post('/v3/mail/send', payload);
      // SendGrid returns 202 + X-Message-Id header on success.
      const providerMessageId =
        (res.headers['x-message-id'] as string | undefined) ?? undefined;
      return {
        channel: 'email',
        provider: this.config.name,
        providerMessageId,
        correlationId: providerMessageId ?? '',
        status: 'sent',
        costAgorot: this.config.estimatedCostAgorot,
      };
    } catch (e) {
      const err = e as AxiosError<{ errors?: { message: string; field?: string }[] }>;
      const status = err.response?.status ?? 0;
      const code = err.response?.data?.errors?.[0]?.message ?? err.code ?? 'sendgrid_error';
      const retryable = status === 0 || status === 429 || status >= 500;
      return {
        channel: 'email',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: {
          code: String(status || code),
          message: err.message,
          retryable,
        },
        raw: err.response?.data,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.http.get('/v3/scopes', { timeout: 5_000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------ //
  private buildPayload(message: Message, recipient: Recipient) {
    const fromEmail = this.opts.fromEmail;
    const fromName = this.opts.fromName ?? 'Sync Up';
    const tracking = this.opts.tracking ?? { click: true, open: true };

    const personalization: Record<string, unknown> = {
      to: [{ email: recipient.address, name: recipient.name }],
    };

    let useTemplate: string | undefined;
    if (message.template) {
      useTemplate = this.opts.templateMap?.[message.template.id] ?? message.template.id;
      personalization.dynamic_template_data = message.template.data ?? {};
    } else if (message.subject) {
      personalization.subject = message.subject;
    }

    const content: { type: string; value: string }[] = [];
    if (!useTemplate) {
      if (message.body) content.push({ type: 'text/plain', value: message.body });
      if (message.html) content.push({ type: 'text/html', value: message.html });
      if (content.length === 0) content.push({ type: 'text/plain', value: '' });
    }

    const attachments = message.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      type: a.contentType,
      disposition: a.disposition ?? 'attachment',
      content_id: a.cid,
    }));

    const payload: Record<string, unknown> = {
      personalizations: [personalization],
      from: { email: fromEmail, name: fromName },
      tracking_settings: {
        click_tracking: { enable: !!tracking.click, enable_text: !!tracking.click },
        open_tracking: { enable: !!tracking.open },
        subscription_tracking: { enable: false },
      },
      custom_args: {
        tenantId: recipient.tenantId,
        ...(recipient.userId ? { userId: recipient.userId } : {}),
        ...(message.metadata ?? {}),
      },
    };
    if (useTemplate) payload.template_id = useTemplate;
    if (content.length) payload.content = content;
    if (attachments?.length) payload.attachments = attachments;
    if (message.scheduledAt) {
      payload.send_at = Math.floor(new Date(message.scheduledAt).getTime() / 1000);
    }
    return payload;
  }
}
