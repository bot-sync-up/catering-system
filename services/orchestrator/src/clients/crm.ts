import { randomUUID } from 'crypto';
import { config } from '../lib/config';
import { makeClient, useMocks } from './http';

const http = makeClient(config.services.crm);

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vatId?: string;
}

export interface Quote {
  id: string;
  customerId: string;
  amount: number;
  currency: 'ILS' | 'USD';
  guests: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
}

export const crmClient = {
  async upsertCustomer(input: Omit<Customer, 'id'> & { id?: string }): Promise<Customer> {
    if (useMocks()) return { id: input.id ?? `cust_${randomUUID().slice(0, 8)}`, ...input };
    const { data } = await http.post('/customers', input);
    return data;
  },

  async createQuote(input: Omit<Quote, 'id' | 'status'>): Promise<Quote> {
    if (useMocks()) return { id: `q_${randomUUID().slice(0, 8)}`, status: 'draft', ...input };
    const { data } = await http.post('/quotes', input);
    return data;
  },

  async approveQuote(quoteId: string): Promise<Quote> {
    if (useMocks()) {
      return {
        id: quoteId,
        customerId: 'cust_mock',
        amount: 0,
        currency: 'ILS',
        guests: 0,
        status: 'approved',
      };
    }
    const { data } = await http.post(`/quotes/${quoteId}/approve`);
    return data;
  },

  async createOrder(quoteId: string): Promise<{ id: string; quoteId: string; status: string }> {
    if (useMocks()) return { id: `ord_${randomUUID().slice(0, 8)}`, quoteId, status: 'open' };
    const { data } = await http.post('/orders', { quoteId });
    return data;
  },

  async cancelOrder(orderId: string, reason: string): Promise<{ id: string; status: string }> {
    if (useMocks()) return { id: orderId, status: 'cancelled' };
    const { data } = await http.post(`/orders/${orderId}/cancel`, { reason });
    return data;
  },
};
