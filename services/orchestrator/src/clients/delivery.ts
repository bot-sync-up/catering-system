import { randomUUID } from 'crypto';
import { config } from '../lib/config';
import { makeClient, useMocks } from './http';

const http = makeClient(config.services.delivery);

export interface DeliveryPlan {
  id: string;
  eventId: string;
  vehicleId: string;
  driverId: string;
  pickupAt: string;
  deliverAt: string;
  address: string;
}

export const deliveryClient = {
  async planRoute(input: { eventId: string; address: string; arriveBy: string }): Promise<DeliveryPlan> {
    if (useMocks()) {
      return {
        id: `dlv_${randomUUID().slice(0, 8)}`,
        eventId: input.eventId,
        vehicleId: 'veh_001',
        driverId: 'drv_001',
        pickupAt: new Date(new Date(input.arriveBy).getTime() - 1000 * 60 * 90).toISOString(),
        deliverAt: input.arriveBy,
        address: input.address,
      };
    }
    const { data } = await http.post('/delivery/plan', input);
    return data;
  },

  async cancelDelivery(deliveryId: string): Promise<{ id: string; status: string }> {
    if (useMocks()) return { id: deliveryId, status: 'cancelled' };
    const { data } = await http.post(`/delivery/${deliveryId}/cancel`);
    return data;
  },
};
