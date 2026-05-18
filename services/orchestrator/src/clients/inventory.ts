import { randomUUID } from 'crypto';
import { config } from '../lib/config';
import { makeClient, useMocks } from './http';

const http = makeClient(config.services.inventory);

export interface StockCheck {
  sku: string;
  required: number;
  onHand: number;
  shortfall: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  lines: { sku: string; qty: number; unitPrice: number }[];
  status: 'draft' | 'sent' | 'received' | 'cancelled';
}

export const inventoryClient = {
  async checkStock(eventId: string, requirements: { sku: string; qty: number }[]): Promise<StockCheck[]> {
    if (useMocks()) {
      return requirements.map((r) => {
        const onHand = Math.floor(r.qty * 0.7); // pretend 70% on hand
        return { sku: r.sku, required: r.qty, onHand, shortfall: Math.max(0, r.qty - onHand) };
      });
    }
    const { data } = await http.post('/stock/check', { eventId, requirements });
    return data;
  },

  async reserveStock(eventId: string, lines: { sku: string; qty: number }[]): Promise<{ reservationId: string }> {
    if (useMocks()) return { reservationId: `res_${randomUUID().slice(0, 8)}` };
    const { data } = await http.post('/stock/reserve', { eventId, lines });
    return data;
  },

  async createPurchaseOrders(shortfalls: StockCheck[]): Promise<PurchaseOrder[]> {
    if (useMocks()) {
      const grouped = shortfalls.filter((s) => s.shortfall > 0);
      if (grouped.length === 0) return [];
      return [
        {
          id: `po_${randomUUID().slice(0, 8)}`,
          supplierId: 'sup_default',
          status: 'sent',
          lines: grouped.map((g) => ({ sku: g.sku, qty: g.shortfall, unitPrice: 12.5 })),
        },
      ];
    }
    const { data } = await http.post('/purchase-orders/bulk', { shortfalls });
    return data;
  },

  async cancelPurchaseOrder(poId: string): Promise<{ id: string; status: string }> {
    if (useMocks()) return { id: poId, status: 'cancelled' };
    const { data } = await http.post(`/purchase-orders/${poId}/cancel`);
    return data;
  },

  async releaseReservation(reservationId: string): Promise<{ id: string; status: string }> {
    if (useMocks()) return { id: reservationId, status: 'released' };
    const { data } = await http.post(`/stock/reservations/${reservationId}/release`);
    return data;
  },
};
