import { describe, expect, it } from 'vitest';
import { buildReminderScript } from '../src/outbound/EventReminderCall.js';
import { buildPaymentScript } from '../src/outbound/PaymentReminderCall.js';
import { buildSurveyScript, classifyNPS } from '../src/outbound/SurveyCall.js';

describe('outbound scripts', () => {
  it('תזכורת אירוע בעברית עם שם ופרטים', () => {
    const text = buildReminderScript({
      customerName: 'דוד',
      customerPhone: '+972501234567',
      eventType: 'חתונה',
      eventDate: '2026-07-15',
      guestCount: 250,
    });
    expect(text).toContain('דוד');
    expect(text).toContain('חתונה');
    expect(text).toContain('250');
  });

  it('תזכורת תשלום עם סכום', () => {
    const text = buildPaymentScript({
      customerName: 'שרה',
      customerPhone: '+972501234567',
      amount: 5000,
      dueDate: '2026-06-01',
      paymentLink: 'https://pay/x',
    });
    expect(text).toContain('שרה');
    expect(text).toContain('5000');
    expect(text).toContain('SMS');
  });

  it('סקר NPS — הסקריפט מציג את התאריך', () => {
    const text = buildSurveyScript({
      customerName: 'אבי',
      customerPhone: '+972501234567',
      eventDate: '2026-05-01',
    });
    expect(text).toContain('אבי');
    expect(text).toContain('2026-05-01');
  });

  it('classifyNPS', () => {
    expect(classifyNPS(10)).toBe('promoter');
    expect(classifyNPS(8)).toBe('passive');
    expect(classifyNPS(5)).toBe('detractor');
  });
});
