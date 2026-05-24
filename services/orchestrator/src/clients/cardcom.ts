import { randomUUID } from 'crypto';
import { config } from '../lib/config';
import { makeClient, useMocks } from './http';

const http = makeClient(config.services.cardcom);

export interface ChargeResult {
  id: string;
  approvalNumber: string;
  last4: string;
  amount: number;
  currency: 'ILS' | 'USD';
  status: 'approved' | 'declined';
}

export interface RefundResult {
  id: string;
  originalChargeId: string;
  amount: number;
  status: 'approved' | 'declined';
}

export const cardcomClient = {
  async charge(input: { token: string; amount: number; currency?: 'ILS' | 'USD'; orderId: string }): Promise<ChargeResult> {
    if (useMocks()) {
      return {
        id: `chg_${randomUUID().slice(0, 8)}`,
        approvalNumber: String(Math.floor(1000000 + Math.random() * 9000000)),
        last4: '4242',
        amount: input.amount,
        currency: input.currency ?? 'ILS',
        status: 'approved',
      };
    }
    const { data } = await http.post('/Interface/ChargeToken.aspx', {
      TerminalNumber: config.cardcom.terminal,
      UserName: config.cardcom.apiName,
      ...input,
    });
    return data;
  },

  async refund(input: { chargeId: string; amount: number }): Promise<RefundResult> {
    if (useMocks()) {
      return {
        id: `rfd_${randomUUID().slice(0, 8)}`,
        originalChargeId: input.chargeId,
        amount: input.amount,
        status: 'approved',
      };
    }
    const { data } = await http.post('/Interface/Refund.aspx', input);
    return data;
  },
};
