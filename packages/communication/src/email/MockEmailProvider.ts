import { randomUUID } from 'crypto';
import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, SendResult } from '../types';

/**
 * In-memory email provider for local dev and tests. Stores everything
 * it "sends" so tests can assert on it.
 */
export class MockEmailProvider implements IMessageSender {
  readonly channel: Channel = 'email';
  readonly config: ProviderConfig;
  readonly outbox: { message: Message; result: SendResult }[] = [];
  private failNext = 0;
  private failRetryable = true;

  constructor(config?: Partial<ProviderConfig>) {
    this.config = {
      name: 'mock-email',
      channel: 'email',
      priority: 100,
      estimatedCostAgorot: 0,
      enabled: true,
      ...config,
    };
  }

  /** Force the next N send() calls to fail. */
  forceFail(times: number, retryable = true) {
    this.failNext = times;
    this.failRetryable = retryable;
  }

  async send(message: Message): Promise<SendResult> {
    if (this.failNext > 0) {
      this.failNext--;
      return {
        channel: 'email',
        provider: this.config.name,
        correlationId: '',
        status: 'failed',
        error: { code: 'forced_fail', message: 'forced for tests', retryable: this.failRetryable },
      };
    }
    const result: SendResult = {
      channel: 'email',
      provider: this.config.name,
      providerMessageId: randomUUID(),
      correlationId: randomUUID(),
      status: 'sent',
      costAgorot: 0,
    };
    this.outbox.push({ message, result });
    return result;
  }

  async healthCheck() {
    return true;
  }
}
