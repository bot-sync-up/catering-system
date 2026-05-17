/**
 * cancelEventSaga - saga לביטול אירוע קייטרינג (8 שלבים).
 *
 * סדר הביצוע (forward):
 *  1. וידוא הרשאות לביטול
 *  2. ביטול ההזמנה במערכת ה-orders
 *  3. ביטול משימות מטבח (kitchen)
 *  4. ביטול שיבוץ אירוע (events scheduler)
 *  5. ביטול משלוח (logistics)
 *  6. החזרת inventory למחסן
 *  7. שחרור עובדים מהשיבוץ (HR)
 *  8. הוצאת זיכוי / החזר תשלום (finance)
 *
 * Compensation (backward) - בדיוק הפוך, כל שלב מחזיר את עצמו אחורה.
 */

import { SagaCoordinator, type SagaStep } from './SagaCoordinator.js';

export interface CancelEventContext extends Record<string, unknown> {
  eventId: string;
  orderId: string;
  customerId: string;
  reason: string;
  cancelledBy: string;
  // נשמרים תוך כדי ריצה כדי לאפשר compensate
  cancellationToken?: string;
  reservedKitchenTaskIds?: string[];
  reservedDeliveryId?: string;
  restoredInventoryItems?: Array<{ sku: string; quantity: number }>;
  releasedEmployeeIds?: string[];
  refundId?: string;
}

export interface CancelEventServices {
  auth: {
    verifyCancelPermission: (userId: string, eventId: string) => Promise<string>;
    revokeCancellation: (token: string) => Promise<void>;
  };
  orders: {
    cancel: (orderId: string, reason: string) => Promise<void>;
    restore: (orderId: string) => Promise<void>;
  };
  kitchen: {
    cancelTasks: (eventId: string) => Promise<string[]>;
    restoreTasks: (taskIds: string[]) => Promise<void>;
  };
  events: {
    unschedule: (eventId: string) => Promise<void>;
    reschedule: (eventId: string) => Promise<void>;
  };
  logistics: {
    cancelDelivery: (orderId: string) => Promise<string>;
    restoreDelivery: (deliveryId: string) => Promise<void>;
  };
  inventory: {
    returnItems: (
      orderId: string,
    ) => Promise<Array<{ sku: string; quantity: number }>>;
    reReserveItems: (items: Array<{ sku: string; quantity: number }>) => Promise<void>;
  };
  hr: {
    releaseStaff: (eventId: string) => Promise<string[]>;
    reAssignStaff: (eventId: string, employeeIds: string[]) => Promise<void>;
  };
  finance: {
    issueRefund: (orderId: string, reason: string) => Promise<string>;
    revokeRefund: (refundId: string) => Promise<void>;
  };
}

export function buildCancelEventSaga(
  services: CancelEventServices,
): SagaCoordinator<CancelEventContext> {
  const saga = new SagaCoordinator<CancelEventContext>('cancel-event');

  const steps: SagaStep<CancelEventContext>[] = [
    {
      name: 'verify-permission',
      retries: 1,
      execute: async (ctx) => {
        ctx.cancellationToken = await services.auth.verifyCancelPermission(
          ctx.cancelledBy,
          ctx.eventId,
        );
      },
      compensate: async (ctx) => {
        if (ctx.cancellationToken) {
          await services.auth.revokeCancellation(ctx.cancellationToken);
        }
      },
    },
    {
      name: 'cancel-order',
      retries: 2,
      execute: async (ctx) => {
        await services.orders.cancel(ctx.orderId, ctx.reason);
      },
      compensate: async (ctx) => {
        await services.orders.restore(ctx.orderId);
      },
    },
    {
      name: 'cancel-kitchen-tasks',
      retries: 2,
      execute: async (ctx) => {
        ctx.reservedKitchenTaskIds = await services.kitchen.cancelTasks(
          ctx.eventId,
        );
      },
      compensate: async (ctx) => {
        if (ctx.reservedKitchenTaskIds?.length) {
          await services.kitchen.restoreTasks(ctx.reservedKitchenTaskIds);
        }
      },
    },
    {
      name: 'unschedule-event',
      retries: 2,
      execute: async (ctx) => {
        await services.events.unschedule(ctx.eventId);
      },
      compensate: async (ctx) => {
        await services.events.reschedule(ctx.eventId);
      },
    },
    {
      name: 'cancel-delivery',
      retries: 2,
      execute: async (ctx) => {
        ctx.reservedDeliveryId = await services.logistics.cancelDelivery(
          ctx.orderId,
        );
      },
      compensate: async (ctx) => {
        if (ctx.reservedDeliveryId) {
          await services.logistics.restoreDelivery(ctx.reservedDeliveryId);
        }
      },
    },
    {
      name: 'return-inventory',
      retries: 2,
      execute: async (ctx) => {
        ctx.restoredInventoryItems = await services.inventory.returnItems(
          ctx.orderId,
        );
      },
      compensate: async (ctx) => {
        if (ctx.restoredInventoryItems?.length) {
          await services.inventory.reReserveItems(ctx.restoredInventoryItems);
        }
      },
    },
    {
      name: 'release-staff',
      retries: 2,
      execute: async (ctx) => {
        ctx.releasedEmployeeIds = await services.hr.releaseStaff(ctx.eventId);
      },
      compensate: async (ctx) => {
        if (ctx.releasedEmployeeIds?.length) {
          await services.hr.reAssignStaff(ctx.eventId, ctx.releasedEmployeeIds);
        }
      },
    },
    {
      name: 'issue-refund',
      retries: 3,
      execute: async (ctx) => {
        ctx.refundId = await services.finance.issueRefund(
          ctx.orderId,
          ctx.reason,
        );
      },
      compensate: async (ctx) => {
        if (ctx.refundId) {
          await services.finance.revokeRefund(ctx.refundId);
        }
      },
    },
  ];

  saga.addSteps(steps);
  return saga;
}
