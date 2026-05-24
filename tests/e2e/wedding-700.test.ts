/**
 * E2E — חתונה 700 איש: 15 שלבים מקצה לקצה
 *
 *  1.  ליד נכנס (CRM upsertCustomer)
 *  2.  בניית הצעת מחיר (createQuote)
 *  3.  אישור הצעה (approveQuote)
 *  4.  מקדמה דרך Cardcom (charge — 25% מהעסקה)
 *  5.  פתיחת הזמנה (createOrder)
 *  6.  קביעת תפריט ושלחי מטבח (planPrepTasks)
 *  7.  שיבוץ אירוע למטבח (createEvent)
 *  8.  בדיקת מלאי + רזרבציה (checkStock + reserveStock)
 *  9.  שיבוץ צוות 50 איש (assignTeam)
 * 10.  תכנון משלוח ושיירה (planRoute)
 * 11.  הוצאת חשבונית מס (icount createInvoice)
 * 12.  iCount allocation של תשלום מלא
 * 13.  charge יתרה ב-Cardcom (סופי)
 * 14.  debrief + BI tracking
 * 15.  שליחת אישור ללקוח (notify email)
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../../services/orchestrator/src/app';
import { resetForTests } from '../../services/orchestrator/src/lib/state';
import { cardcomClient } from '../../services/orchestrator/src/clients/cardcom';
import { icountClient } from '../../services/orchestrator/src/clients/icount';
import { biClient } from '../../services/orchestrator/src/clients/bi';
import { notifyClient } from '../../services/orchestrator/src/clients/notify';

let app: Application;

beforeAll(() => {
  process.env.USE_MOCKS = 'true';
  app = createApp();
});

beforeEach(() => {
  resetForTests();
});

const WEDDING_INPUT = {
  customer: {
    name: 'משפחת כהן',
    phone: '+972501234567',
    email: 'cohen.wedding@example.com',
    vatId: '301234567',
  },
  event: {
    date: '2026-08-12T18:00:00.000Z',
    guests: 700,
    venue: 'גני האירועים — הרצליה',
    address: 'דרך מנחם בגין 12, הרצליה',
    arriveBy: '2026-08-12T16:30:00.000Z',
    type: 'wedding' as const,
  },
  quote: { amount: 245_000, currency: 'ILS' as const },
  menu: [
    { dish: 'אנטיפסטי דגים', qty: 700, station: 'cold' as const },
    { dish: 'אנטריקוט', qty: 700, station: 'hot' as const },
    { dish: 'קינוח שוקולד', qty: 700, station: 'pastry' as const },
    { dish: 'קוקטיילים', qty: 1400, station: 'bar' as const },
  ],
  ingredients: [
    { sku: 'BEEF-ENTRECOTE', qty: 245 },
    { sku: 'SALMON-FILLET', qty: 105 },
    { sku: 'CHOCOLATE-70', qty: 35 },
    { sku: 'WINE-RED', qty: 180 },
    { sku: 'WINE-WHITE', qty: 120 },
  ],
  staffPlan: [
    { role: 'manager' as const, count: 2 },
    { role: 'chef' as const, count: 3 },
    { role: 'sous' as const, count: 6 },
    { role: 'waiter' as const, count: 35 },
    { role: 'bartender' as const, count: 4 },
  ],
};

describe('E2E: חתונה 700 איש — תזרים מלא של 15 שלבים', () => {
  it('מבצע את כל 15 השלבים ומחזיר תוצאה שלמה', async () => {
    // STEP 1-10: יצירת ההזמנה והאירוע דרך orchestrator
    const orderRes = await request(app).post('/api/orchestrate/new-event-order').send(WEDDING_INPUT);

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.result.ok).toBe(true);

    const { customerId, quoteId, orderId, eventId, reservationId, purchaseOrderIds, staffAssignmentIds, deliveryId } =
      orderRes.body.result;

    expect(customerId).toMatch(/^cust_/);
    expect(quoteId).toMatch(/^q_/);
    expect(orderId).toMatch(/^ord_/);
    expect(eventId).toMatch(/^evt_/);
    expect(reservationId).toMatch(/^res_/);
    expect(Array.isArray(purchaseOrderIds)).toBe(true);
    expect(staffAssignmentIds.length).toBeGreaterThan(0);
    expect(deliveryId).toMatch(/^dlv_/);

    // STEP 4 (out-of-band): מקדמה 25% דרך Cardcom — מבוצע ישירות כתשלום ראשון
    const deposit = await cardcomClient.charge({
      token: 'tok_deposit_visa_4242',
      amount: Math.round(WEDDING_INPUT.quote.amount * 0.25),
      currency: 'ILS',
      orderId,
    });
    expect(deposit.status).toBe('approved');
    expect(deposit.amount).toBe(61250);

    // STEP 11-13-15: approve-and-bill — חשבונית, החיוב הסופי, allocation, מייל
    const balance = WEDDING_INPUT.quote.amount - deposit.amount;
    const billRes = await request(app)
      .post('/api/orchestrate/approve-and-bill')
      .send({
        orderId,
        customerId,
        invoiceAmount: balance,
        vatRate: 0.18,
        paymentToken: 'tok_balance_visa_4242',
        currency: 'ILS',
        notifyEmail: WEDDING_INPUT.customer.email,
      });

    expect(billRes.status).toBe(200);
    expect(billRes.body.result.ok).toBe(true);
    expect(billRes.body.result.invoiceId).toMatch(/^inv_/);
    expect(billRes.body.result.invoiceDocNumber).toMatch(/^\d{6}$/);
    expect(billRes.body.result.chargeId).toMatch(/^chg_/);
    expect(billRes.body.result.approvalNumber).toMatch(/^\d{7}$/);
    expect(billRes.body.result.allocationId).toMatch(/^alloc_/);

    // השלמת ה-allocation גם של המקדמה (כשהיתה מחוץ ל-saga)
    const depositAlloc = await icountClient.allocatePayment({
      invoiceId: billRes.body.result.invoiceId,
      paymentId: deposit.id,
      amount: deposit.amount,
    });
    expect(depositAlloc.status).toBe('allocated');

    // STEP 14: debrief + BI
    const bi = await biClient.track('wedding_completed', {
      orderId,
      eventId,
      guests: WEDDING_INPUT.event.guests,
      grossAmount: WEDDING_INPUT.quote.amount,
    });
    expect(bi.ok).toBe(true);

    // STEP 15 already inside approve-and-bill (email-receipt) — verify a follow-up debrief mail too
    const debriefMail = await notifyClient.send({
      channel: 'email',
      to: 'ops@example.com',
      template: 'event-debrief',
      vars: { orderId, eventId, guests: 700 },
    });
    expect(debriefMail.status).toBe('sent');

    // וידוא שכל 15 השלבים אכן עברו דרך ה-run records של ה-saga
    const stepsRun1 = orderRes.body.run.steps.map((s: { name: string }) => s.name);
    const stepsRun2 = billRes.body.run.steps.map((s: { name: string }) => s.name);
    expect(stepsRun1).toEqual(
      expect.arrayContaining([
        'create-or-upsert-customer',
        'create-quote',
        'create-order',
        'schedule-event',
        'plan-prep-tasks',
        'check-inventory',
        'reserve-stock',
        'create-purchase-orders',
        'assign-staff',
        'plan-delivery',
        'notify-customer',
        'track-bi',
      ]),
    );
    expect(stepsRun2).toEqual(
      expect.arrayContaining([
        'approve-quote-and-order',
        'create-invoice',
        'cardcom-charge',
        'icount-allocate-payment',
        'email-receipt',
      ]),
    );
  });

  it('דוחה קלט לא תקין (zod 400)', async () => {
    const res = await request(app)
      .post('/api/orchestrate/new-event-order')
      .send({ ...WEDDING_INPUT, event: { ...WEDDING_INPUT.event, guests: -5 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_failed');
  });

  it('מקלל POs כשיש shortfall במלאי', async () => {
    const res = await request(app).post('/api/orchestrate/new-event-order').send(WEDDING_INPUT);
    expect(res.status).toBe(201);
    expect(res.body.result.purchaseOrderIds.length).toBeGreaterThan(0);
  });
});
