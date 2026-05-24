/**
 * מבצע את אירועי ה-side-effect שנפלטו ע"י ה-hooks (יוצר חשבונית, הצ"מ וכו').
 */

import type { SideEffectEvent } from '@/domain/hooks/registry';
import { prisma } from '../db';
import { promoteFromWaitlist } from '@/domain/waitlist/waitlist';

export async function applyEffects(events: SideEffectEvent[]): Promise<void> {
  for (const e of events) {
    switch (e.kind) {
      case 'invoice.create': {
        await prisma.invoice.upsert({
          where: { orderId: e.orderId },
          update: {},
          create: {
            orderId: e.orderId,
            invoiceNumber: `INV-${Date.now()}-${rand4()}`,
            totalAmount: e.amount,
            taxAmount: e.tax,
          },
        });
        break;
      }
      case 'shipment_doc.create': {
        await prisma.shipmentDoc.upsert({
          where: { orderId: e.orderId },
          update: {},
          create: {
            orderId: e.orderId,
            docNumber: `SHP-${Date.now()}-${rand4()}`,
          },
        });
        break;
      }
      case 'kitchen.tasks.create': {
        await prisma.kitchenTask.createMany({
          data: e.tasks.map((t) => ({
            orderId: e.orderId,
            title: t.title,
            description: t.description,
            dueAt: t.dueAt,
          })),
        });
        break;
      }
      case 'delivery.create': {
        await prisma.delivery.upsert({
          where: { orderId: e.orderId },
          update: {},
          create: {
            orderId: e.orderId,
            address: e.address,
            scheduledAt: e.scheduledAt,
          },
        });
        break;
      }
      case 'notification.send': {
        // pluggable — כאן רק לוג. בייצור: WhatsApp Cloud API / SMTP / SMS.
        // eslint-disable-next-line no-console
        console.info('[notify]', e.channel, e.template, e.orderId);
        break;
      }
      case 'waitlist.try_promote': {
        const all = await prisma.waitlist.findMany({
          where: { eventDate: e.eventDate, promoted: false },
          orderBy: { position: 'asc' },
        });
        const { promoted } = promoteFromWaitlist(
          all.map((w) => ({
            id: w.id,
            customerId: w.customerId,
            guestCount: w.guestCount,
            position: w.position,
            promoted: w.promoted,
            eventDate: w.eventDate,
          })),
          e.freedSlots
        );
        for (const p of promoted) {
          await prisma.waitlist.update({
            where: { id: p.id },
            data: { promoted: true, promotedAt: new Date(), notified: true },
          });
        }
        break;
      }
    }
  }
}

function rand4(): string {
  return Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
}
