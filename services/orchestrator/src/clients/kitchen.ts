import { randomUUID } from 'crypto';
import { config } from '../lib/config';
import { makeClient, useMocks } from './http';

const http = makeClient(config.services.kitchen);

export interface PrepTask {
  id: string;
  eventId: string;
  dish: string;
  qty: number;
  startBy: string;
  station: 'cold' | 'hot' | 'pastry' | 'bar';
}

export const kitchenClient = {
  async createEvent(input: { orderId: string; date: string; guests: number; venue: string }) {
    if (useMocks()) return { id: `evt_${randomUUID().slice(0, 8)}`, ...input, status: 'scheduled' };
    const { data } = await http.post('/events', input);
    return data;
  },

  async planPrepTasks(eventId: string, menu: { dish: string; qty: number; station: PrepTask['station'] }[]): Promise<PrepTask[]> {
    if (useMocks()) {
      return menu.map((m) => ({
        id: `prep_${randomUUID().slice(0, 6)}`,
        eventId,
        dish: m.dish,
        qty: m.qty,
        station: m.station,
        startBy: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
      }));
    }
    const { data } = await http.post(`/events/${eventId}/prep`, { menu });
    return data;
  },
};
