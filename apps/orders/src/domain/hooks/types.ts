/**
 * Hook framework — מאפשר רישום פעולות שמופעלות במעברי סטטוס
 * (יצירת חשבונית, יצירת הצ"מ, פתיחת משימות מטבח, פתיחת משלוח, קידום waitlist).
 */

import type { OrderStatusKey } from '../order/stateMachine';

export interface HookOrder {
  id: string;
  orderNumber: string;
  type: 'ONE_TIME_EVENT' | 'RECURRING_PLAN' | 'MONTHLY_SUBSCRIPTION';
  customerId: string;
  totalAmount: number;
  taxAmount: number;
  eventDate?: Date | null;
  eventLocation?: string | null;
  guestCount?: number | null;
  items: Array<{
    productSku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    kitchenInstructions?: string | null;
  }>;
}

export interface HookContext {
  order: HookOrder;
  fromStatus: OrderStatusKey | null;
  toStatus: OrderStatusKey;
  actor?: string;
  reason?: string;
  /** Side-effect bus — נוצר ע"י ה-engine; כל hook יכול לדחוף אירועים. */
  emit: (event: SideEffectEvent) => void;
}

export type SideEffectEvent =
  | { kind: 'invoice.create'; orderId: string; amount: number; tax: number }
  | { kind: 'shipment_doc.create'; orderId: string }
  | {
      kind: 'kitchen.tasks.create';
      orderId: string;
      tasks: Array<{ title: string; description?: string; dueAt?: Date }>;
    }
  | { kind: 'delivery.create'; orderId: string; address: string; scheduledAt?: Date }
  | { kind: 'notification.send'; channel: 'WHATSAPP' | 'EMAIL' | 'SMS'; orderId: string; template: string }
  | { kind: 'waitlist.try_promote'; eventDate: Date; freedSlots: number };

export type Hook = (ctx: HookContext) => Promise<void> | void;
