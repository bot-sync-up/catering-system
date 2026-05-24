import axios, { AxiosError, AxiosInstance } from 'axios';
import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, Recipient, SendResult } from '../types';
import { WHATSAPP_TEMPLATES, WhatsAppTemplate } from './templates';

export interface MetaCloudOptions {
  /** Permanent access token issued by Meta. */
  accessToken: string;
  /** WhatsApp Business Phone Number ID (NOT the phone number itself). */
  phoneNumberId: string;
  /** Graph API version, e.g. "v19.0". */
  graphVersion?: string;
  /** Base URL override (tests). */
  baseUrl?: string;
}

export type WhatsAppInteractive =
  | { type: 'button'; body: string; buttons: { id: string; title: string }[] }
  | {
      type: 'list';
      body: string;
      buttonLabel: string;
      sections: { title: string; rows: { id: string; title: string; description?: string }[] }[];
    };

export interface WhatsAppMediaPayload {
  /** Either a public URL or a previously-uploaded media id. */
  url?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
}

/**
 * Meta WhatsApp Cloud API provider.
 *
 * Supports:
 *   - Pre-approved template messages (used to start conversations / outside 24h)
 *   - Free-form text inside the 24-hour customer-service window
 *   - Media (image / video / document / audio)
 *   - Interactive (buttons / list)
 *
 * Outside the 24h window you MUST send a template. The provider auto-decides
 * based on whether `message.template` is set — caller is responsible for
 * knowing whether they're inside the window.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class MetaCloudProvider implements IMessageSender {
  readonly channel: Channel = 'whatsapp';
  readonly config: ProviderConfig;
  private readonly http: AxiosInstance;
  private readonly opts: MetaCloudOptions;

  constructor(opts: MetaCloudOptions, config?: Partial<ProviderConfig>) {
    this.opts = opts;
    this.config = {
      name: 'meta-cloud',
      channel: 'whatsapp',
      priority: 1,
      estimatedCostAgorot: 15, // varies by country + conversation category
      enabled: true,
      ...config,
    };
    const ver = opts.graphVersion ?? 'v19.0';
    this.http = axios.create({
      baseURL: opts.baseUrl ?? `https://graph.facebook.com/${ver}`,
      timeout: 15_000,
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async send(message: Message): Promise<SendResult> {
    const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
    const payload = this.buildPayload(message, recipient);

    try {
      const res = await this.http.post<{
        messages: { id: string }[];
        contacts?: { wa_id: string }[];
      }>(`/${this.opts.phoneNumberId}/messages`, payload);
      const id = res.data.messages?.[0]?.id;
      return {
        channel: 'whatsapp',
        provider: this.config.name,
        providerMessageId: id,
        correlationId: id ?? '',
        status: 'sent',
        costAgorot: this.config.estimatedCostAgorot,
        raw: res.data,
      };
    } catch (e) {
      const err = e as AxiosError<{ error?: { code?: number; message?: string; type?: string } }>;
      const status = err.response?.status ?? 0;
      const errBody = err.response?.data?.error;
      const code = errBody?.code ?? status;
      // 4xx with code 131056 (rate limit) etc. are retryable; most 4xx are not.
      const retryable =
        status === 0 ||
        status === 429 ||
        status >= 500 ||
        code === 131_056 ||
        code === 130_429;
      return {
        channel: 'whatsapp',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: {
          code: String(code),
          message: errBody?.message ?? err.message,
          retryable,
        },
        raw: err.response?.data,
      };
    }
  }

  /** Send pre-approved template message — required outside 24h window. */
  async sendTemplate(
    recipient: Recipient,
    templateName: string,
    variables: Record<string, string> = {},
    languageCode = 'he',
  ): Promise<SendResult> {
    return this.send({
      channel: 'whatsapp',
      to: recipient,
      template: { id: templateName, data: { ...variables, _languageCode: languageCode } },
    });
  }

  /** Upload media file to Meta and get a media id (re-usable for 30 days). */
  async uploadMedia(file: { data: Buffer; filename: string; mimeType: string }): Promise<string> {
    // The real implementation must use multipart/form-data. Kept thin
    // here because uploads are usually triggered separately from sends.
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', file.data, { filename: file.filename, contentType: file.mimeType });
    const res = await this.http.post<{ id: string }>(`/${this.opts.phoneNumberId}/media`, form, {
      headers: form.getHeaders(),
    });
    return res.data.id;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.http.get(`/${this.opts.phoneNumberId}`, { timeout: 5_000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------ //
  private buildPayload(message: Message, recipient: Recipient): Record<string, unknown> {
    const base = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient.address.replace(/^\+/, ''),
    };

    // 1) Template message
    if (message.template) {
      const tpl: WhatsAppTemplate | undefined = WHATSAPP_TEMPLATES[message.template.id];
      const data = (message.template.data ?? {}) as Record<string, unknown>;
      const languageCode = (data._languageCode as string) ?? tpl?.languageCode ?? 'he';
      const parameters = tpl
        ? tpl.variables.map((v) => ({ type: 'text', text: String(data[v] ?? '') }))
        : Object.values(data).map((v) => ({ type: 'text', text: String(v) }));

      return {
        ...base,
        type: 'template',
        template: {
          name: tpl?.name ?? message.template.id,
          language: { code: languageCode },
          components: parameters.length
            ? [{ type: 'body', parameters }]
            : undefined,
        },
      };
    }

    // 2) Interactive (lives in metadata.interactive — typed loosely so we
    //    can pass it without expanding the public Message type).
    const interactive = (message.metadata as unknown as { _whatsappInteractive?: WhatsAppInteractive } | undefined)
      ?._whatsappInteractive;
    if (interactive) {
      if (interactive.type === 'button') {
        return {
          ...base,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: interactive.body },
            action: {
              buttons: interactive.buttons.map((b) => ({
                type: 'reply',
                reply: { id: b.id, title: b.title },
              })),
            },
          },
        };
      }
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: interactive.body },
          action: {
            button: interactive.buttonLabel,
            sections: interactive.sections,
          },
        },
      };
    }

    // 3) Media (first attachment wins)
    if (message.attachments?.length) {
      const a = message.attachments[0];
      const mediaType = mediaKindFromContentType(a.contentType);
      const mediaBlock: Record<string, unknown> = {};
      if (a.url) mediaBlock.link = a.url;
      if (a.content) mediaBlock.id = a.content; // assume content holds media id
      if (a.filename) mediaBlock.filename = a.filename;
      if (message.body) mediaBlock.caption = message.body;
      return { ...base, type: mediaType, [mediaType]: mediaBlock };
    }

    // 4) Free-form text (only legal inside 24h window)
    return {
      ...base,
      type: 'text',
      text: { body: message.body ?? '', preview_url: true },
    };
  }
}

function mediaKindFromContentType(ct?: string): 'image' | 'video' | 'document' | 'audio' {
  if (!ct) return 'document';
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  return 'document';
}
