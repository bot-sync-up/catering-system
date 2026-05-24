import { randomUUID } from 'crypto';
import { config } from '../lib/config';
import { makeClient, useMocks } from './http';

const http = makeClient(config.services.icount, {
  headers: { Authorization: `Bearer ${config.icount.apiKey}` },
});

export interface Invoice {
  id: string;
  docNumber: string;
  customerId: string;
  amount: number;
  vat: number;
  status: 'open' | 'allocated' | 'paid' | 'cancelled';
  pdfUrl: string;
}

export interface CreditNote {
  id: string;
  docNumber: string;
  invoiceId: string;
  amount: number;
}

export const icountClient = {
  async createInvoice(input: { customerId: string; orderId: string; amount: number; vatRate: number }): Promise<Invoice> {
    if (useMocks()) {
      const vat = +(input.amount * input.vatRate).toFixed(2);
      return {
        id: `inv_${randomUUID().slice(0, 8)}`,
        docNumber: String(Math.floor(100000 + Math.random() * 900000)),
        customerId: input.customerId,
        amount: input.amount,
        vat,
        status: 'open',
        pdfUrl: `https://mock.icount.local/invoice/${randomUUID().slice(0, 6)}.pdf`,
      };
    }
    const { data } = await http.post('/api/v3.php/doc/create', { ...input, type: 'invoice' });
    return data;
  },

  /** "iCount allocation" — allocate a received payment against an invoice */
  async allocatePayment(input: { invoiceId: string; paymentId: string; amount: number }) {
    if (useMocks()) {
      return { allocationId: `alloc_${randomUUID().slice(0, 8)}`, ...input, status: 'allocated' };
    }
    const { data } = await http.post('/api/v3.php/doc/allocate', input);
    return data;
  },

  async createCreditNote(input: { invoiceId: string; amount: number; reason: string }): Promise<CreditNote> {
    if (useMocks()) {
      return {
        id: `cn_${randomUUID().slice(0, 8)}`,
        docNumber: String(Math.floor(100000 + Math.random() * 900000)),
        invoiceId: input.invoiceId,
        amount: input.amount,
      };
    }
    const { data } = await http.post('/api/v3.php/doc/create', { ...input, type: 'credit_note' });
    return data;
  },
};
