/**
 * Default hooks — מתחברים ל-registry בעת אתחול האפליקציה.
 *
 * בעת approved -> preparing:
 *   - יוצרים חשבונית
 *   - יוצרים הצ"מ
 *   - פותחים משימות מטבח (אחת לכל פריט עם הוראות, או אגרגציה)
 *   - יוצרים רשומת משלוח
 *
 * בעת cancelled (מכל מצב):
 *   - מנסים לקדם waitlist (אם הזמנה אירוע ויש כמות אורחים)
 *   - שולחים נוטיפיקציה ללקוח
 *
 * בעת approved (מאישור מנהל):
 *   - שולחים אישור ללקוח (ווטסאפ אם הערוץ זמין)
 */

import { hookRegistry } from './registry';

export function registerDefaultHooks(): void {
  hookRegistry.clear();

  // אישור -> הכנה: יצירת מסמכים + משימות מטבח + משלוח
  hookRegistry.on('approved', 'preparing', async (ctx) => {
    const { order, emit } = ctx;
    emit({
      kind: 'invoice.create',
      orderId: order.id,
      amount: order.totalAmount,
      tax: order.taxAmount,
    });
    emit({ kind: 'shipment_doc.create', orderId: order.id });

    // משימות מטבח — אחת לכל פריט שיש לו הוראות, ואחת מסכמת.
    const tasks = order.items
      .filter((it) => it.kitchenInstructions)
      .map((it) => ({
        title: `הכנת ${it.quantity}× ${it.productName}`,
        description: it.kitchenInstructions ?? undefined,
        dueAt: order.eventDate ?? undefined,
      }));

    if (tasks.length === 0 && order.items.length > 0) {
      tasks.push({
        title: `הכנת הזמנה ${order.orderNumber}`,
        description: `${order.items.length} פריטים`,
        dueAt: order.eventDate ?? undefined,
      });
    }

    if (tasks.length > 0) {
      emit({ kind: 'kitchen.tasks.create', orderId: order.id, tasks });
    }

    emit({
      kind: 'delivery.create',
      orderId: order.id,
      address: order.eventLocation ?? '',
      scheduledAt: order.eventDate ?? undefined,
    });
  });

  // אישור מנהל -> שולחים אישור ללקוח
  hookRegistry.on('pending', 'approved', (ctx) => {
    ctx.emit({
      kind: 'notification.send',
      channel: 'WHATSAPP',
      orderId: ctx.order.id,
      template: 'order_approved',
    });
  });

  // ביטול -> נוטיפיקציה ללקוח + ניסיון קידום waitlist (לאירועים)
  hookRegistry.on('*', 'cancelled', (ctx) => {
    ctx.emit({
      kind: 'notification.send',
      channel: 'WHATSAPP',
      orderId: ctx.order.id,
      template: 'order_cancelled',
    });

    if (
      ctx.order.type === 'ONE_TIME_EVENT' &&
      ctx.order.eventDate &&
      ctx.order.guestCount &&
      ctx.order.guestCount > 0
    ) {
      ctx.emit({
        kind: 'waitlist.try_promote',
        eventDate: ctx.order.eventDate,
        freedSlots: ctx.order.guestCount,
      });
    }
  });

  // קידום מ-waitlist -> נוטיפיקציה ללקוח
  hookRegistry.on('waitlisted', 'approved', (ctx) => {
    ctx.emit({
      kind: 'notification.send',
      channel: 'WHATSAPP',
      orderId: ctx.order.id,
      template: 'waitlist_promoted',
    });
  });
}
