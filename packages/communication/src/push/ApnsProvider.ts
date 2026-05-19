import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, SendResult } from '../types';

export interface ApnsProviderOptions {
  /** Token-based auth (preferred over .p12 certs). */
  token: {
    key: string; // contents of the .p8 file
    keyId: string;
    teamId: string;
  };
  /** App bundle id, e.g. "co.il.syncup.driver". */
  topic: string;
  production?: boolean;
  /** Injected for tests. */
  provider?: ApnsProviderLike;
}

export interface ApnsProviderLike {
  send: (notification: unknown, token: string) => Promise<{ sent: { device: string }[]; failed: { device: string; status?: string; response?: { reason?: string } }[] }>;
}

/**
 * Apple Push Notification Service provider.
 *
 * Uses HTTP/2 token auth. Wraps the `node-apn` library which is the most
 * battle-tested option in Node.
 */
export class ApnsProvider implements IMessageSender {
  readonly channel: Channel = 'push';
  readonly config: ProviderConfig;
  private apn: ApnsProviderLike | null;
  private readonly opts: ApnsProviderOptions;

  constructor(opts: ApnsProviderOptions, config?: Partial<ProviderConfig>) {
    this.opts = opts;
    this.apn = opts.provider ?? null;
    this.config = {
      name: 'apns',
      channel: 'push',
      priority: 3,
      estimatedCostAgorot: 0,
      enabled: true,
      ...config,
    };
  }

  async send(message: Message): Promise<SendResult> {
    const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
    const apn = await this.ensureProvider();

    // Build APNS payload — note "alert" supports title/body/subtitle.
    const notification = {
      topic: this.opts.topic,
      priority: message.priority === 'critical' ? 10 : 5,
      payload: { custom: message.metadata ?? {} },
      alert: { title: message.subject ?? '', body: message.body ?? '' },
      sound: 'default',
    };

    try {
      const out = await apn.send(notification, recipient.address);
      if (out.failed.length === 0) {
        const id = out.sent[0]?.device;
        return {
          channel: 'push',
          provider: this.config.name,
          providerMessageId: id,
          correlationId: id ?? '',
          status: 'sent',
          costAgorot: 0,
        };
      }
      const f = out.failed[0];
      const reason = f.response?.reason ?? f.status ?? 'apns_error';
      const permanent = new Set([
        'BadDeviceToken',
        'Unregistered',
        'DeviceTokenNotForTopic',
        'BadCertificate',
      ]);
      return {
        channel: 'push',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: {
          code: reason,
          message: reason,
          retryable: !permanent.has(reason),
        },
      };
    } catch (e) {
      const err = e as Error;
      return {
        channel: 'push',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: { code: 'apns_error', message: err.message, retryable: true },
      };
    }
  }

  private async ensureProvider(): Promise<ApnsProviderLike> {
    if (this.apn) return this.apn;
    const apn = await import('node-apn');
    const provider = new apn.Provider({
      token: this.opts.token,
      production: this.opts.production ?? true,
    });
    this.apn = {
      send: async (n, t) => {
        const note = new apn.Notification(n as object);
        const r = await provider.send(note as never, t);
        return {
          sent: r.sent.map((x) => ({ device: x.device })),
          failed: r.failed.map((x) => ({
            device: x.device,
            status: x.status,
            response: x.response as { reason?: string } | undefined,
          })),
        };
      },
    };
    return this.apn;
  }
}
