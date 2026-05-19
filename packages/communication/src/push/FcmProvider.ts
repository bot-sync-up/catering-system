import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, SendResult } from '../types';

export interface FcmProviderOptions {
  /** Service account JSON content (parsed). */
  serviceAccount: {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  /** Injected for tests; defaults to firebase-admin. */
  messaging?: FcmMessagingLike;
}

export interface FcmMessagingLike {
  send: (message: unknown) => Promise<string>;
}

/**
 * Firebase Cloud Messaging — used for Android-native apps not on Expo.
 *
 * Uses HTTP v1 API via firebase-admin SDK. We lazy-init the SDK so the
 * package can be imported even when FCM creds aren't configured.
 */
export class FcmProvider implements IMessageSender {
  readonly channel: Channel = 'push';
  readonly config: ProviderConfig;
  private messaging: FcmMessagingLike | null;
  private readonly opts: FcmProviderOptions;

  constructor(opts: FcmProviderOptions, config?: Partial<ProviderConfig>) {
    this.opts = opts;
    this.messaging = opts.messaging ?? null;
    this.config = {
      name: 'fcm',
      channel: 'push',
      priority: 3,
      estimatedCostAgorot: 0,
      enabled: true,
      ...config,
    };
  }

  async send(message: Message): Promise<SendResult> {
    const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
    const messaging = await this.ensureMessaging();

    const fcmMessage = {
      token: recipient.address,
      notification: { title: message.subject ?? '', body: message.body ?? '' },
      data: message.metadata ?? {},
      android: {
        priority: message.priority === 'critical' ? 'high' : 'normal',
      },
    };

    try {
      const id = await messaging.send(fcmMessage);
      return {
        channel: 'push',
        provider: this.config.name,
        providerMessageId: id,
        correlationId: id,
        status: 'sent',
        costAgorot: 0,
      };
    } catch (e) {
      const err = e as Error & { code?: string };
      // Known unrecoverable codes — caller should drop the token.
      const permanent = new Set([
        'messaging/registration-token-not-registered',
        'messaging/invalid-registration-token',
        'messaging/invalid-argument',
      ]);
      return {
        channel: 'push',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: {
          code: err.code ?? 'fcm_error',
          message: err.message,
          retryable: !permanent.has(err.code ?? ''),
        },
      };
    }
  }

  private async ensureMessaging(): Promise<FcmMessagingLike> {
    if (this.messaging) return this.messaging;
    const admin = await import('firebase-admin');
    const app =
      admin.apps.find((a) => a?.name === `comm-${this.opts.serviceAccount.project_id}`) ??
      admin.initializeApp(
        {
          credential: admin.credential.cert(this.opts.serviceAccount as admin.ServiceAccount),
        },
        `comm-${this.opts.serviceAccount.project_id}`,
      );
    this.messaging = admin.messaging(app);
    return this.messaging;
  }
}
