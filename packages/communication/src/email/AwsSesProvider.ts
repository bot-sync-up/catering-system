import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, Recipient, SendResult } from '../types';

export interface AwsSesOptions {
  region: string;
  fromEmail: string;
  fromName?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  /** Optional configuration set name for tracking. */
  configurationSetName?: string;
  /** Injected for tests. Real code uses @aws-sdk/client-ses. */
  client?: AwsSesClient;
}

export interface AwsSesClient {
  send(command: { input: unknown }): Promise<{ MessageId?: string }>;
}

/**
 * AWS SES fallback for email. Cheaper than SendGrid for high volume,
 * but no dynamic-template merge fields the way SendGrid does — we
 * pre-render Hebrew templates locally and send the resulting HTML.
 */
export class AwsSesProvider implements IMessageSender {
  readonly channel: Channel = 'email';
  readonly config: ProviderConfig;
  private readonly opts: AwsSesOptions;
  private client: AwsSesClient | null;

  constructor(opts: AwsSesOptions, config?: Partial<ProviderConfig>) {
    this.opts = opts;
    this.client = opts.client ?? null;
    this.config = {
      name: 'aws-ses',
      channel: 'email',
      priority: 5, // fallback
      estimatedCostAgorot: 1, // ~0.01 ILS / email
      enabled: true,
      ...config,
    };
  }

  async send(message: Message): Promise<SendResult> {
    const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
    const client = await this.ensureClient();
    const fromHeader = this.opts.fromName
      ? `"${this.opts.fromName}" <${this.opts.fromEmail}>`
      : this.opts.fromEmail;

    const input = {
      Source: fromHeader,
      Destination: { ToAddresses: [recipient.address] },
      Message: {
        Subject: { Data: message.subject ?? '', Charset: 'UTF-8' },
        Body: {
          ...(message.html ? { Html: { Data: message.html, Charset: 'UTF-8' } } : {}),
          ...(message.body ? { Text: { Data: message.body, Charset: 'UTF-8' } } : {}),
        },
      },
      ...(this.opts.configurationSetName
        ? { ConfigurationSetName: this.opts.configurationSetName }
        : {}),
      Tags: this.buildTags(message, recipient),
    };

    try {
      const out = await client.send({ input });
      return {
        channel: 'email',
        provider: this.config.name,
        providerMessageId: out.MessageId,
        correlationId: out.MessageId ?? '',
        status: 'sent',
        costAgorot: this.config.estimatedCostAgorot,
      };
    } catch (e) {
      const err = e as Error & { $metadata?: { httpStatusCode?: number }; name?: string };
      const status = err.$metadata?.httpStatusCode ?? 0;
      const retryable = status === 0 || status === 429 || status >= 500;
      return {
        channel: 'email',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: { code: err.name ?? 'ses_error', message: err.message, retryable },
      };
    }
  }

  private buildTags(message: Message, recipient: Recipient) {
    const tags = [{ Name: 'tenantId', Value: recipient.tenantId }];
    if (recipient.userId) tags.push({ Name: 'userId', Value: recipient.userId });
    if (message.metadata) {
      for (const [k, v] of Object.entries(message.metadata).slice(0, 8)) {
        tags.push({ Name: k.slice(0, 256), Value: v.slice(0, 256) });
      }
    }
    return tags;
  }

  private async ensureClient(): Promise<AwsSesClient> {
    if (this.client) return this.client;
    // Lazy import keeps the SDK out of bundles when not used.
    const sdk = await import('@aws-sdk/client-ses');
    const { SESClient, SendEmailCommand } = sdk as {
      SESClient: new (cfg: unknown) => { send: (c: unknown) => Promise<{ MessageId?: string }> };
      SendEmailCommand: new (input: unknown) => unknown;
    };
    const real = new SESClient({
      region: this.opts.region,
      credentials:
        this.opts.accessKeyId && this.opts.secretAccessKey
          ? { accessKeyId: this.opts.accessKeyId, secretAccessKey: this.opts.secretAccessKey }
          : undefined,
    });
    this.client = {
      send: (cmd) => real.send(new SendEmailCommand((cmd as { input: unknown }).input)),
    };
    return this.client;
  }
}
