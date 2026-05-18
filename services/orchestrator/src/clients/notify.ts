import { randomUUID } from 'crypto';
import { config } from '../lib/config';
import { makeClient, useMocks } from './http';

const http = makeClient(config.services.notify);

export type Channel = 'email' | 'sms' | 'whatsapp';

export interface NotificationResult {
  id: string;
  channel: Channel;
  to: string;
  status: 'queued' | 'sent' | 'failed';
}

export const notifyClient = {
  async send(input: { channel: Channel; to: string; template: string; vars?: Record<string, unknown> }): Promise<NotificationResult> {
    if (useMocks()) {
      return { id: `ntf_${randomUUID().slice(0, 8)}`, channel: input.channel, to: input.to, status: 'sent' };
    }
    const { data } = await http.post('/send', input);
    return data;
  },
};
