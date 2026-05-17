/**
 * E2E — SAGA של ביטול אירוע + compensation.
 *
 *  - מבצע new-event-order (סטטוס חי)
 *  - מחייב את הלקוח (Cardcom + iCount)
 *  - שולח בקשת cancel-event
 *  - וידוא: order=cancelled, refund=approved, POs cancelled, staff released,
 *           delivery cancelled, credit-note הונפק, BI נרשם
 *  - case שני: כשל ב-step אמצעי גורר compensation אחורה ב-new-event-order
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../../services/orchestrator/src/app';
import { resetForTests } from '../../services/orchestrator/src/lib/state';
import { cardcomClient } from '../../services/orchestrator/src/clients/cardcom';
import { staffClient } from '../../services/orchestrator/src/clients/staff';
import { runNewEventOrder } from '../../services/orchestrator/src/workflows/new-event-order';
import { runApproveAndBill } from '../../services/orchestrator/src/workflows/approve-and-bill';

let app: Application;

beforeAll(() => {
  process.env.USE_MOCKS = 'true';
  app = createApp();
});

beforeEach(() => {
  resetForTests();
});

const baseInput = {
  customer: { name: 'משפ׳ לוי', phone: '+972541112233', email: 'levi@example.com' },
  event: {
    date: '2026-09-01T18:00:00.000Z',
    guests: 250,
    venue: 'גן אירועים — תל אביב',
    address: 'דיזנגוף 100, תל אביב',
    arriveBy: '2026-09-01T16:30:00.000Z',
    type: 'wedding' as const,
  },
  quote: { amount: 90_000, currency: 'ILS' as const },
  menu: [
    { dish: 'סלטים', qty: 250, station: 'cold' as const },
    { dish: 'עוף שלם', qty: 250, station: 'hot' as const },
  ],
  ingredients: [
    { sku: 'CHICKEN-WHOLE', qty: 90 },
    { sku: 'VEG-MIX', qty: 50 },
  ],
  staffPlan: [
    { role: 'chef' as const, count: 2 },
    { role: 'waiter' as const, count: 12 },
  ],
};

describe('E2E: ביטול אירוע — SAGA + compensation', () => {
  it('מבטל אירוע מלא: refund, ביטול POs, שחרור צוות, credit-note, BI', async () => {
    const order = await runNewEventOrder(baseInput);
    expect(order.result.ok).toBe(true);

    const bill = await runApproveAndBill({
      orderId: order.result.orderId!,
      customerId: order.result.customerId!,
      invoiceAmount: baseInput.quote.amount,
      vatRate: 0.17,
      paymentToken: 'tok_test_visa_4242',
      currency: 'ILS',
      notifyEmail: baseInput.customer.email,
    });
    expect(bill.result.ok).toBe(true);

    const cancelRes = await request(app)
      .post('/api/orchestrate/cancel-event')
      .send({
        orderId: order.result.orderId,
        eventId: order.result.eventId,
        reason: 'כוח עליון — מגפה',
        refund: { chargeId: bill.result.chargeId, amount: baseInput.quote.amount },
        invoiceId: bill.result.invoiceId,
        reservationId: order.result.reservationId,
        purchaseOrderIds: order.result.purchaseOrderIds,
        deliveryId: order.result.deliveryId,
        notifyEmail: baseInput.customer.email,
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.result.ok).toBe(true);
    expect(cancelRes.body.result.orderCancelled).toBe(true);
    expect(cancelRes.body.result.refundId).toMatch(/^rfd_/);
    expect(cancelRes.body.result.cancelledPurchaseOrderIds.length).toBe(
      order.result.purchaseOrderIds.length,
    );
    expect(cancelRes.body.result.staffReleased).toBe(true);
    expect(cancelRes.body.result.deliveryCancelled).toBe(true);
    expect(cancelRes.body.result.creditNoteId).toMatch(/^cn_/);

    const stepNames = cancelRes.body.run.steps.map((s: { name: string }) => s.name);
    expect(stepNames).toEqual(
      expect.arrayContaining([
        'cancel-order',
        'refund-payment',
        'cancel-purchase-orders',
        'release-staff',
        'cancel-delivery',
        'issue-credit-note',
        'notify-customer',
        'track-bi-cancellation',
      ]),
    );
  });

  it('דוחה refund שנדחה ע"י Cardcom וממשיך לרשום כשל בשלב', async () => {
    const spy = vi.spyOn(cardcomClient, 'refund').mockResolvedValueOnce({
      id: 'rfd_denied',
      originalChargeId: 'chg_x',
      amount: 100,
      status: 'declined',
    });

    const cancelRes = await request(app)
      .post('/api/orchestrate/cancel-event')
      .send({
        orderId: 'ord_x',
        eventId: 'evt_x',
        reason: 'בקשת לקוח',
        refund: { chargeId: 'chg_x', amount: 100 },
        purchaseOrderIds: [],
      });

    expect(cancelRes.status).toBe(500);
    expect(cancelRes.body.result.ok).toBe(false);
    expect(cancelRes.body.result.failedStep).toBe('refund-payment');
    spy.mockRestore();
  });

  it('compensation אחורה: כשל ב-assign-staff מבטל POs, רזרבציה והזמנה', async () => {
    const spy = vi
      .spyOn(staffClient, 'assignTeam')
      .mockRejectedValueOnce(new Error('staff system down'));

    const order = await runNewEventOrder(baseInput);
    expect(order.result.ok).toBe(false);
    expect(order.result.failedStep).toBe('assign-staff');

    const stepNames = order.run.steps.map((s) => s.name);
    expect(stepNames).toEqual(
      expect.arrayContaining([
        'compensate:create-purchase-orders',
        'compensate:reserve-stock',
        'compensate:create-order',
      ]),
    );
    spy.mockRestore();
  });
});
