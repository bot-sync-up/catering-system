import { describe, it, expect } from 'vitest';
import {
  portalAdapter,
  phoneAdapter,
  whatsappAdapter,
  agentAdapter,
} from '../src/channels';

describe('Channel adapters', () => {
  it('portal — מעביר את הקלט with channel=PORTAL', () => {
    const r = portalAdapter.parse({
      customer: { fullName: 'א ב', phone: '050' },
      type: 'ONE_TIME_EVENT',
      items: [{ productSku: 'x', productName: 'X', quantity: 1, unitPrice: 10 }],
    });
    expect(r.channel).toBe('PORTAL');
  });

  it('phone — דורש takenBy', () => {
    expect(() =>
      phoneAdapter.parse({
        customer: { fullName: 'א', phone: '050' },
        type: 'ONE_TIME_EVENT',
        items: [{ productSku: 'x', productName: 'X', quantity: 1, unitPrice: 10 }],
        takenBy: '',
      })
    ).toThrow(/takenBy/);
  });

  it('agent — דורש agentId', () => {
    expect(() =>
      agentAdapter.parse({
        customer: { fullName: 'א', phone: '050' },
        type: 'ONE_TIME_EVENT',
        items: [{ productSku: 'x', productName: 'X', quantity: 1, unitPrice: 10 }],
        agentId: '',
      })
    ).toThrow();
  });

  it('whatsapp — מנתח טקסט מובנה', () => {
    const text = [
      'שם: ישראל ישראלי',
      'טלפון: 050-1234567',
      'אירוע: 12/05/2026, 50 איש',
      'כתובת: רחוב הרצל 5',
      'פריטים:',
      '- 50 חמין מנה (45)',
      '- 20 קוגל ירושלמי (35)',
    ].join('\n');
    const r = whatsappAdapter.parse({ fromPhone: '050', text });
    expect(r.customer.fullName).toBe('ישראל ישראלי');
    expect(r.guestCount).toBe(50);
    expect(r.items).toHaveLength(2);
    expect(r.items[0].quantity).toBe(50);
    expect(r.items[0].unitPrice).toBe(45);
  });
});
