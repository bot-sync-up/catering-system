/**
 * cancelEventSaga.ts — saga של ביטול אירוע קייטרינג.
 *
 * 8 שלבים, כל אחד עם compensation:
 *  1. validateCancellation     — בדיקה שאפשר לבטל
 *  2. cancelOrder              — סימון הזמנה כמבוטלת
 *  3. cancelKitchenPrep        — ביטול הכנה במטבח
 *  4. cancelDelivery           — ביטול שיבוץ נהג/רכב
 *  5. releaseInventory         — שחרור מלאי שהוקצה
 *  6. issueRefund              — החזר כספי (אם רלוונטי)
 *  7. issueCreditNote          — חשבונית זיכוי
 *  8. notifyCustomer           — הודעה ללקוח
 *
 * כל compensate מבצע פעולה הפוכה: re-activate order, re-allocate stock, וכו'.
 *
 * את הסאגה בונים דרך `buildCancelEventSaga(deps)` כך שכל ה-side-effects
 * (קריאות לשירותים אחרים) מועברים pure-functional ולא hard-coded.
 */
import type { SagaDefinition, SagaStep } from './SagaCoordinator.js';

export interface CancelEventContext {
  orderId: string;
  eventId: string;
  reason: string;
  refundAmount?: number;
  customerId: string;
  /** מיופים ע"י השלבים */
  cancellationToken?: string;
  kitchenTaskId?: string;
  deliveryId?: string;
  inventoryReservationId?: string;
  refundTxId?: string;
  creditNoteId?: string;
  notificationId?: string;
  [key: string]: unknown;
}

/**
 * dependencies — services שצריך לעצור את העבודה איתם.
 * כולם stubs לצורך הבדיקה — ההזרקה האמיתית מגיעה מ-bootstrap הפרויקט.
 */
export interface CancelEventDeps {
  orderService: {
    validateCancellation(orderId: string): Promise<string>;
    cancel(orderId: string, token: string): Promise<void>;
    reactivate(orderId: string, token: string): Promise<void>;
  };
  kitchenService: {
    cancelPrep(orderId: string): Promise<string>;
    restorePrep(taskId: string): Promise<void>;
  };
  logisticsService: {
    cancelDelivery(orderId: string): Promise<string>;
    restoreDelivery(deliveryId: string): Promise<void>;
  };
  inventoryService: {
    release(orderId: string): Promise<string>;
    reReserve(reservationId: string): Promise<void>;
  };
  paymentService: {
    refund(orderId: string, amount: number): Promise<string>;
    voidRefund(refundTxId: string): Promise<void>;
  };
  financeService: {
    issueCreditNote(orderId: string, amount: number): Promise<string>;
    voidCreditNote(creditNoteId: string): Promise<void>;
  };
  notificationService: {
    notifyCancellation(customerId: string, orderId: string): Promise<string>;
    revertNotification(notificationId: string): Promise<void>;
  };
}

export function buildCancelEventSaga(
  ctx: CancelEventContext,
  deps: CancelEventDeps
): SagaDefinition<CancelEventContext> {
  const steps: SagaStep<CancelEventContext>[] = [
    {
      name: 'validateCancellation',
      execute: async (c) => {
        c.cancellationToken = await deps.orderService.validateCancellation(c.orderId);
      },
      compensate: async () => {
        // אין compensation — validate בלבד
      },
    },
    {
      name: 'cancelOrder',
      execute: async (c) => {
        if (!c.cancellationToken) throw new Error('Missing cancellation token');
        await deps.orderService.cancel(c.orderId, c.cancellationToken);
      },
      compensate: async (c) => {
        if (c.cancellationToken) {
          await deps.orderService.reactivate(c.orderId, c.cancellationToken);
        }
      },
    },
    {
      name: 'cancelKitchenPrep',
      execute: async (c) => {
        c.kitchenTaskId = await deps.kitchenService.cancelPrep(c.orderId);
      },
      compensate: async (c) => {
        if (c.kitchenTaskId) await deps.kitchenService.restorePrep(c.kitchenTaskId);
      },
    },
    {
      name: 'cancelDelivery',
      execute: async (c) => {
        c.deliveryId = await deps.logisticsService.cancelDelivery(c.orderId);
      },
      compensate: async (c) => {
        if (c.deliveryId) await deps.logisticsService.restoreDelivery(c.deliveryId);
      },
    },
    {
      name: 'releaseInventory',
      execute: async (c) => {
        c.inventoryReservationId = await deps.inventoryService.release(c.orderId);
      },
      compensate: async (c) => {
        if (c.inventoryReservationId) {
          await deps.inventoryService.reReserve(c.inventoryReservationId);
        }
      },
    },
    {
      name: 'issueRefund',
      execute: async (c) => {
        if (c.refundAmount && c.refundAmount > 0) {
          c.refundTxId = await deps.paymentService.refund(c.orderId, c.refundAmount);
        }
      },
      compensate: async (c) => {
        if (c.refundTxId) await deps.paymentService.voidRefund(c.refundTxId);
      },
    },
    {
      name: 'issueCreditNote',
      execute: async (c) => {
        if (c.refundAmount && c.refundAmount > 0) {
          c.creditNoteId = await deps.financeService.issueCreditNote(c.orderId, c.refundAmount);
        }
      },
      compensate: async (c) => {
        if (c.creditNoteId) await deps.financeService.voidCreditNote(c.creditNoteId);
      },
    },
    {
      name: 'notifyCustomer',
      execute: async (c) => {
        c.notificationId = await deps.notificationService.notifyCancellation(c.customerId, c.orderId);
      },
      compensate: async (c) => {
        if (c.notificationId) await deps.notificationService.revertNotification(c.notificationId);
      },
    },
  ];

  return {
    name: 'cancel-event',
    steps,
    context: ctx,
  };
}
