import axios, { AxiosError, AxiosInstance } from 'axios';
import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, Recipient, SendResult } from '../types';
import { applySmsTemplate } from './templates';

export interface TwilioOptions {
  accountSid: string;
  authToken: string;
  /** E.164 sending number, e.g. "+12025550100", or a Messaging Service SID. */
  from: string;
  /** If `from` is a Messaging Service SID, set this to true. */
  fromIsMessagingService?: boolean;
  /** Status callback URL — Twilio posts delivery status here. */
  statusCallbackUrl?: string;
  /** Base URL override (for tests). */
  baseUrl?: string;
}

/**
 * Twilio international fallback for SMS — only used when 019 is down
 * or for destinations outside Israel.
 *
 * Docs: https://www.twilio.com/docs/sms/api
 */
export class TwilioProvider implements IMessageSender {
  readonly channel: Channel = 'sms';
  readonly config: ProviderConfig;
  private readonly http: AxiosInstance;
  private readonly opts: TwilioOptions;

  constructor(opts: TwilioOptions, config?: Partial<ProviderConfig>) {
    this.opts = opts;
    this.config = {
      name: 'twilio',
      channel: 'sms',
      priority: 5,
      estimatedCostAgorot: 25, // international SMS ~$0.07
      enabled: true,
      ...config,
    };
    this.http = axios.create({
      baseURL: opts.baseUrl ?? 'https://api.twilio.com',
      timeout: 15_000,
      auth: { username: opts.accountSid, password: opts.authToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async send(message: Message): Promise<SendResult> {
    const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
    const text = message.template
      ? applySmsTemplate(message.template.id, message.template.data ?? {})
      : message.body ?? '';

    const params = new URLSearchParams({
      To: recipient.address,
      Body: text,
    });
    if (this.opts.fromIsMessagingService) params.set('MessagingServiceSid', this.opts.from);
    else params.set('From', this.opts.from);
    if (this.opts.statusCallbackUrl) params.set('StatusCallback', this.opts.statusCallbackUrl);

    try {
      const res = await this.http.post<{ sid: string; status: string; error_code?: number; error_message?: string }>(
        `/2010-04-01/Accounts/${this.opts.accountSid}/Messages.json`,
        params.toString(),
      );
      return {
        channel: 'sms',
        provider: this.config.name,
        providerMessageId: res.data.sid,
        correlationId: res.data.sid,
        status: 'sent',
        costAgorot: this.config.estimatedCostAgorot,
      };
    } catch (e) {
      const err = e as AxiosError<{ code?: number; message?: string }>;
      const status = err.response?.status ?? 0;
      const code = err.response?.data?.code ?? status;
      return {
        channel: 'sms',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: {
          code: String(code),
          message: err.response?.data?.message ?? err.message,
          retryable: status === 0 || status === 429 || status >= 500,
        },
        raw: err.response?.data,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.http.get(`/2010-04-01/Accounts/${this.opts.accountSid}.json`, {
        timeout: 5_000,
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }
}
