/**
 * Order Engine — מקשר state-machine, DB ו-hooks.
 *
 * שיטה מרכזית: transition(orderId, event) — מחשבת את המעבר, מאשרת אותו,
 * מעדכנת את ה-DB, רושמת היסטוריה ומריצה hooks.
 */

import type { OrderEvent, OrderStatusKey } from './stateMachine';
import { ALLOWED_TRANSITIONS, assertTransition } from './stateMachine';
import { hookRegistry, type SideEffectEvent } from '../hooks/registry';
import type { HookOrder } from '../hooks/types';
import {
  fromPrismaStatus,
  toPrismaStatus,
  type PrismaOrderStatus,
} from './statusMap';

/**
 * תרגום מאירוע למצב יעד. הסטטוס ההתחלתי קובע איזה אירוע חוקי.
 */
export function nextStatus(
  current: OrderStatusKey,
  event: OrderEvent
): OrderStatusKey {
  const candidate = EVENT_TO_TARGET[event.type];
  if (!candidate) {
    throw new Error(`אירוע לא ידוע: ${event.type}`);
  }
  if (!ALLOWED_TRANSITIONS[current].includes(candidate)) {
    throw new Error(
      `לא ניתן לבצע ${event.type} כשההזמנה במצב ${current}`
    );
  }
  return candidate;
}

const EVENT_TO_TARGET: Record<OrderEvent['type'], OrderStatusKey> = {
  SUBMIT: 'pending',
  APPROVE: 'approved',
  REJECT: 'cancelled',
  WAITLIST: 'waitlisted',
  PROMOTE_FROM_WAITLIST: 'approved',
  START_PREPARING: 'preparing',
  START_DELIVERY: 'delivering',
  COMPLETE: 'completed',
  CANCEL: 'cancelled',
};

/**
 * ה-port שאליו ה-engine ניגש ל-DB. אפשר להזריק mock בטסטים.
 */
export interface OrderRepo {
  getOrder(id: string): Promise<{
    status: PrismaOrderStatus;
    order: HookOrder;
  } | null>;
  updateStatus(
    id: string,
    next: PrismaOrderStatus,
    actor?: string,
    reason?: string
  ): Promise<void>;
  appendStatusHistory(
    id: string,
    fromStatus: PrismaOrderStatus | null,
    toStatus: PrismaOrderStatus,
    actor?: string,
    reason?: string
  ): Promise<void>;
}

export interface TransitionResult {
  fromStatus: OrderStatusKey;
  toStatus: OrderStatusKey;
  sideEffects: SideEffectEvent[];
}

export class OrderEngine {
  constructor(private readonly repo: OrderRepo) {}

  async transition(
    orderId: string,
    event: OrderEvent
  ): Promise<TransitionResult> {
    const snapshot = await this.repo.getOrder(orderId);
    if (!snapshot) throw new Error(`הזמנה לא נמצאה: ${orderId}`);

    const fromStatus = fromPrismaStatus(snapshot.status);
    const toStatus = nextStatus(fromStatus, event);
    assertTransition(fromStatus, toStatus);

    const actor = 'actor' in event ? event.actor : undefined;
    const reason =
      event.type === 'REJECT' ? event.reason : 'reason' in event ? event.reason : undefined;

    await this.repo.updateStatus(
      orderId,
      toPrismaStatus(toStatus),
      actor,
      reason
    );
    await this.repo.appendStatusHistory(
      orderId,
      toPrismaStatus(fromStatus),
      toPrismaStatus(toStatus),
      actor,
      reason
    );

    const sideEffects = await hookRegistry.run({
      order: snapshot.order,
      fromStatus,
      toStatus,
      actor,
      reason,
    });

    return { fromStatus, toStatus, sideEffects };
  }
}
