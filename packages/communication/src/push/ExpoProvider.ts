import axios, { AxiosError, AxiosInstance } from 'axios';
import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, SendResult } from '../types';

export interface ExpoProviderOptions {
  /** Optional Expo access token (when sending from secure servers). */
  accessToken?: string;
  baseUrl?: string;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Expo Push Notification provider.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */
export class ExpoProvider implements IMessageSender {
  readonly channel: Channel = 'push';
  readonly config: ProviderConfig;
  private readonly http: AxiosInstance;

  constructor(opts: ExpoProviderOptions = {}, config?: Partial<ProviderConfig>) {
    this.config = {
      name: 'expo-push',
      channel: 'push',
      priority: 1,
      estimatedCostAgorot: 0,
      enabled: true,
      ...config,
    };
    this.http = axios.create({
      baseURL: opts.baseUrl ?? 'https://exp.host',
      timeout: 15_000,
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        ...(opts.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : {}),
      },
    });
  }

  async send(message: Message): Promise<SendResult> {
    const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
    const payload = {
      to: recipient.address, // Expo push token, e.g. "ExponentPushToken[...]"
      title: message.subject,
      body: message.body,
      data: message.metadata ?? {},
      sound: 'default',
      priority: message.priority === 'critical' ? 'high' : 'default',
    };
    try {
      const res = await this.http.post<{ data: ExpoTicket | ExpoTicket[] }>(
        '/--/api/v2/push/send',
        payload,
      );
      const tickets = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
      const t = tickets[0];
      if (t.status === 'ok') {
        return {
          channel: 'push',
          provider: this.config.name,
          providerMessageId: t.id,
          correlationId: t.id ?? '',
          status: 'sent',
          costAgorot: 0,
        };
      }
      // Common error: DeviceNotRegistered → not retryable, caller should
      // remove the token from its store.
      const retryable =
        t.details?.error !== 'DeviceNotRegistered' && t.details?.error !== 'InvalidCredentials';
      return {
        channel: 'push',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: {
          code: t.details?.error ?? 'expo_error',
          message: t.message ?? 'Expo push failed',
          retryable,
        },
        raw: t,
      };
    } catch (e) {
      const err = e as AxiosError;
      const status = err.response?.status ?? 0;
      return {
        channel: 'push',
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
}
