import axios, { AxiosError, AxiosInstance } from 'axios';
import { Builder, parseStringPromise } from 'xml2js';
import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, Recipient, SendResult } from '../types';
import { applySmsTemplate, normalizeIsraeliPhone } from './templates';

export interface Provider019Options {
  /** Username supplied by 019 (a.k.a. "ssn" in their docs). */
  username: string;
  /** Password supplied by 019. */
  password: string;
  /**
   * Sender id — alphanumeric (up to 11 chars) OR a phone number.
   * Must be pre-approved by the cellular operators.
   */
  source: string;
  /** XML API endpoint. Defaults to 019's prod URL. */
  endpoint?: string;
  /** Default delivery notification URL. */
  deliveryNotificationUrl?: string;
}

/**
 * 019 Israeli SMS gateway — XML-over-HTTPS protocol.
 *
 * Documentation: https://019.co.il/SMS_API
 * Endpoint: POST https://019sms.co.il/api with text/xml body.
 *
 * The request envelope is `<sms>...</sms>`. The response is also XML —
 * we parse it and map status codes to retryable/non-retryable failures.
 */
export class Provider019 implements IMessageSender {
  readonly channel: Channel = 'sms';
  readonly config: ProviderConfig;
  private readonly http: AxiosInstance;
  private readonly xmlBuilder = new Builder({ headless: true, renderOpts: { pretty: false } });
  private readonly opts: Provider019Options;

  constructor(opts: Provider019Options, config?: Partial<ProviderConfig>) {
    this.opts = opts;
    this.config = {
      name: '019sms',
      channel: 'sms',
      priority: 1,
      estimatedCostAgorot: 7, // ~0.07 ILS / SMS in Israel
      enabled: true,
      ...config,
    };
    this.http = axios.create({
      baseURL: opts.endpoint ?? 'https://019sms.co.il',
      timeout: 15_000,
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });
  }

  async send(message: Message): Promise<SendResult> {
    const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
    const phone = normalizeIsraeliPhone(recipient.address);
    const text = this.resolveText(message);

    const xml = this.xmlBuilder.buildObject({
      sms: {
        user: {
          username: this.opts.username,
          password: this.opts.password,
        },
        source: this.opts.source,
        destinations: { phone: [phone] },
        message: { _: text, $: { charset: 'UTF8' } },
        ...(this.opts.deliveryNotificationUrl
          ? { delivery_notification_url: this.opts.deliveryNotificationUrl }
          : {}),
        ...(message.scheduledAt
          ? { scheduled_delivery_date: new Date(message.scheduledAt).toISOString() }
          : {}),
        customer_message_id: message.idempotencyKey ?? '',
      },
    });

    try {
      const res = await this.http.post('/api', xml);
      const parsed = (await parseStringPromise(res.data, { explicitArray: false })) as {
        sms?: { status?: string; message?: string; messageid?: string };
      };
      const status = parsed.sms?.status;
      const providerMessageId = parsed.sms?.messageid;
      // 019 returns status="0" on success. Anything else is an error code.
      if (status === '0' || status === undefined) {
        return {
          channel: 'sms',
          provider: this.config.name,
          providerMessageId,
          correlationId: providerMessageId ?? '',
          status: 'sent',
          costAgorot: this.estimateCostForText(text),
        };
      }
      return {
        channel: 'sms',
        provider: this.config.name,
        correlationId: providerMessageId ?? '',
        status: 'failed',
        error: {
          code: `019_${status}`,
          message: parsed.sms?.message ?? `019 status=${status}`,
          retryable: this.isRetryable019Code(status),
        },
        raw: parsed,
      };
    } catch (e) {
      const err = e as AxiosError;
      const status = err.response?.status ?? 0;
      return {
        channel: 'sms',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: {
          code: String(status),
          message: err.message,
          retryable: status === 0 || status === 429 || status >= 500,
        },
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // 019 has no dedicated health endpoint — a malformed call still proves
      // reachability. We swallow the parse error and treat any HTTP 2xx/4xx
      // (anything other than network failure) as "reachable".
      await this.http.post('/api', '<sms></sms>', { timeout: 5_000, validateStatus: () => true });
      return true;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------ //
  private resolveText(message: Message): string {
    if (message.template) {
      return applySmsTemplate(message.template.id, message.template.data ?? {});
    }
    return message.body ?? '';
  }

  /** SMS in Israel: 1 segment = 70 chars Unicode (Hebrew) or 160 GSM-7. */
  private estimateCostForText(text: string): number {
    const segments = Math.max(1, Math.ceil(text.length / 70));
    return (this.config.estimatedCostAgorot ?? 7) * segments;
  }

  private isRetryable019Code(code: string): boolean {
    // Doc'd 019 codes: 1=auth, 2=invalid xml, 3=invalid source,
    // 4=invalid destination, 5=insufficient credit, 6=internal, 7=blocked.
    // Treat internal (6) + transport-level as retryable. Auth/format/credit not.
    return code === '6';
  }

  /** Build delivery-notification handler — see ../webhooks/twilioStatus.ts pattern. */
}
