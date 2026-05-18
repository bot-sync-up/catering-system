import { config } from '../lib/config';
import { makeClient, useMocks } from './http';

const http = makeClient(config.services.bi);

export const biClient = {
  async track(event: string, payload: Record<string, unknown>): Promise<{ ok: true }> {
    if (useMocks()) return { ok: true };
    await http.post('/events', { event, payload, ts: new Date().toISOString() });
    return { ok: true };
  },
};
