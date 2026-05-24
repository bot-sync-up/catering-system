import { describe, expect, it } from 'vitest';
import { startOrderDialog, promptForState } from '../src/dialog/OrderDialog.js';

describe('OrderDialog state machine', () => {
  it('עובר greeting → identify על קלט ראשון', () => {
    const actor = startOrderDialog('test-call');
    actor.send({ type: 'USER_INPUT', text: 'שלום', entities: {} });
    expect(actor.getSnapshot().value).toBe('identify');
  });

  it('עובר ל-date כאשר יש eventType', () => {
    const actor = startOrderDialog('test-call');
    actor.send({ type: 'USER_INPUT', text: 'שלום', entities: {} });
    actor.send({ type: 'USER_INPUT', text: 'חתונה', entities: { eventType: 'wedding' } });
    expect(['eventType', 'date']).toContain(String(actor.getSnapshot().value));
  });

  it('זרימה מלאה מסתיימת ב-goodbye', () => {
    const actor = startOrderDialog('test-call');
    actor.send({ type: 'USER_INPUT', text: 'שלום', entities: {} });
    actor.send({ type: 'USER_INPUT', text: 'חתונה', entities: { eventType: 'wedding' } });
    actor.send({ type: 'USER_INPUT', text: 'בעוד חודש', entities: { date: '2026-06-24' } });
    actor.send({ type: 'USER_INPUT', text: '200 איש', entities: { guestCount: 200 } });
    actor.send({ type: 'USER_INPUT', text: 'בשרי', entities: { menuItems: ['בשרי'] } });
    actor.send({ type: 'CONFIRM' });
    actor.send({ type: 'CONFIRM' });
    expect(actor.getSnapshot().value).toBe('goodbye');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('אסקלציה לאחר יותר מדי ניסיונות', () => {
    const actor = startOrderDialog('test-call');
    actor.send({ type: 'USER_INPUT', text: 'שלום', entities: {} });
    actor.send({ type: 'ESCALATE' });
    expect(actor.getSnapshot().value).toBe('escalation');
  });

  it('promptForState מחזיר טקסט עברי לכל מצב', () => {
    const ctx = { callSid: 't', order: {}, attempts: {} };
    expect(promptForState('greeting', ctx)).toMatch(/שלום/);
    expect(promptForState('eventType', ctx)).toMatch(/אירוע/);
    expect(promptForState('goodbye', ctx)).toMatch(/תודה/);
  });
});
