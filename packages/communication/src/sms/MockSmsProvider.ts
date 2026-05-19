import { randomUUID } from 'crypto';
import { IMessageSender } from '../IMessageSender';
import { Channel, Message, ProviderConfig, SendResult } from '../types';

export class MockSmsProvider implements IMessageSender {
  readonly channel: Channel = 'sms';
  readonly config: ProviderConfig;
  readonly outbox: { message: Message; result: SendResult }[] = [];

  constructor(config?: Partial<ProviderConfig>) {
    this.config = {
      name: 'mock-sms',
      channel: 'sms',
      priority: 100,
      estimatedCostAgorot: 0,
      enabled: true,
      ...config,
    };
  }

  async send(message: Message): Promise<SendResult> {
    const result: SendResult = {
      channel: 'sms',
      provider: this.config.name,
      providerMessageId: randomUUID(),
      correlationId: randomUUID(),
      status: 'sent',
      costAgorot: 0,
    };
    this.outbox.push({ message, result });
    return result;
  }
}
