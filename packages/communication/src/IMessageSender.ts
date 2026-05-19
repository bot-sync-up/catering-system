import { Channel, Message, ProviderConfig, SendResult } from './types';

/**
 * Every channel provider (SendGrid, 019, Meta Cloud, Expo, ...) implements
 * this interface. The UnifiedSender talks to providers only through it.
 */
export interface IMessageSender {
  readonly config: ProviderConfig;

  /** Channel this sender supports — must match config.channel. */
  readonly channel: Channel;

  /**
   * Send a single message. Implementations MUST:
   *   - never throw on provider-side errors (return SendResult with error{})
   *   - mark error.retryable=true for transient failures (5xx, timeouts, 429)
   *   - mark error.retryable=false for permanent failures (bad address, 4xx)
   */
  send(message: Message): Promise<SendResult>;

  /**
   * Optional bulk send. Default UnifiedSender falls back to sequential
   * `send()` calls if not implemented.
   */
  sendBatch?(messages: Message[]): Promise<SendResult[]>;

  /**
   * Lightweight health check — used by the router to skip dead providers.
   * Should not throw. Return true if the provider is reachable.
   */
  healthCheck?(): Promise<boolean>;
}
