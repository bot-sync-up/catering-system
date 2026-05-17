/**
 * Order State Machine
 * --------------------
 * המעברים החוקיים של הזמנה:
 *
 *   draft -> pending      (לקוח/סוכן הגיש)
 *   draft -> cancelled    (לקוח ביטל לפני הגשה)
 *   pending -> approved   (מנהל אישר)
 *   pending -> waitlisted (אין מקום באירוע)
 *   pending -> cancelled  (מנהל דחה / לקוח חזר בו)
 *   waitlisted -> approved (התפנה מקום)
 *   waitlisted -> cancelled
 *   approved -> preparing (יצא למטבח)
 *   approved -> cancelled (ביטול לפני הכנה — מדיניות חלקית)
 *   preparing -> delivering (הוכן, נשלח)
 *   preparing -> cancelled  (ביטול נדיר — בד"כ ללא החזר)
 *   delivering -> completed
 *   delivering -> cancelled (כישלון משלוח)
 *   completed -> (סופי)
 *   cancelled -> (סופי)
 */

import { setup, assign, createActor } from 'xstate';

export type OrderStatusKey =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'preparing'
  | 'delivering'
  | 'completed'
  | 'cancelled'
  | 'waitlisted';

export type OrderEvent =
  | { type: 'SUBMIT'; actor?: string }
  | { type: 'APPROVE'; actor: string }
  | { type: 'REJECT'; actor: string; reason: string }
  | { type: 'WAITLIST'; actor?: string; reason?: string }
  | { type: 'PROMOTE_FROM_WAITLIST'; actor?: string }
  | { type: 'START_PREPARING'; actor?: string }
  | { type: 'START_DELIVERY'; actor?: string }
  | { type: 'COMPLETE'; actor?: string }
  | { type: 'CANCEL'; actor?: string; reason?: string };

export interface OrderContext {
  orderId: string;
  reason?: string;
  approvedBy?: string;
  rejectedReason?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

/**
 * המכונה המרכזית
 */
export const orderMachine = setup({
  types: {
    context: {} as OrderContext,
    events: {} as OrderEvent,
  },
  actions: {
    recordApproval: assign({
      approvedBy: ({ event }) =>
        event.type === 'APPROVE' ? event.actor : undefined,
    }),
    recordRejection: assign({
      rejectedReason: ({ event }) =>
        event.type === 'REJECT' ? event.reason : undefined,
    }),
    recordCancellation: assign({
      cancelledBy: ({ event }) =>
        'actor' in event ? event.actor : undefined,
      cancellationReason: ({ event }) =>
        'reason' in event ? event.reason : undefined,
    }),
  },
}).createMachine({
  id: 'order',
  initial: 'draft',
  context: ({ input }) =>
    (input as OrderContext) ?? { orderId: 'unknown' },
  states: {
    draft: {
      on: {
        SUBMIT: { target: 'pending' },
        CANCEL: { target: 'cancelled', actions: 'recordCancellation' },
      },
    },
    pending: {
      on: {
        APPROVE: { target: 'approved', actions: 'recordApproval' },
        REJECT: { target: 'cancelled', actions: 'recordRejection' },
        WAITLIST: { target: 'waitlisted' },
        CANCEL: { target: 'cancelled', actions: 'recordCancellation' },
      },
    },
    waitlisted: {
      on: {
        PROMOTE_FROM_WAITLIST: { target: 'approved' },
        CANCEL: { target: 'cancelled', actions: 'recordCancellation' },
      },
    },
    approved: {
      on: {
        START_PREPARING: { target: 'preparing' },
        CANCEL: { target: 'cancelled', actions: 'recordCancellation' },
      },
    },
    preparing: {
      on: {
        START_DELIVERY: { target: 'delivering' },
        CANCEL: { target: 'cancelled', actions: 'recordCancellation' },
      },
    },
    delivering: {
      on: {
        COMPLETE: { target: 'completed' },
        CANCEL: { target: 'cancelled', actions: 'recordCancellation' },
      },
    },
    completed: { type: 'final' },
    cancelled: { type: 'final' },
  },
});

/**
 * עוזר עצמאי — האם המעבר חוקי?
 * (לשימוש בולידציה לפני שמירה ב-DB; שיטה אופציונלית במקום להריץ actor)
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatusKey, OrderStatusKey[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['approved', 'waitlisted', 'cancelled'],
  waitlisted: ['approved', 'cancelled'],
  approved: ['preparing', 'cancelled'],
  preparing: ['delivering', 'cancelled'],
  delivering: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransition(
  from: OrderStatusKey,
  to: OrderStatusKey
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: OrderStatusKey,
  to: OrderStatusKey
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `מעבר סטטוס לא חוקי: ${from} -> ${to}`
    );
  }
}

/**
 * יוצר actor להזמנה. מאפשר start/send/getSnapshot.
 */
export function createOrderActor(initialContext: OrderContext) {
  return createActor(orderMachine, { input: initialContext });
}
