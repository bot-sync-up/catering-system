/**
 * מימוש OrderRepo מעל Prisma.
 */

import { prisma } from '../db';
import type { OrderRepo } from '@/domain/order/engine';
import type { PrismaOrderStatus } from '@/domain/order/statusMap';
import type { HookOrder } from '@/domain/hooks/types';

export const prismaOrderRepo: OrderRepo = {
  async getOrder(id) {
    const o = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!o) return null;
    const order: HookOrder = {
      id: o.id,
      orderNumber: o.orderNumber,
      type: o.type,
      customerId: o.customerId,
      totalAmount: o.totalAmount,
      taxAmount: o.taxAmount,
      eventDate: o.eventDate ?? null,
      eventLocation: o.eventLocation ?? null,
      guestCount: o.guestCount ?? null,
      items: o.items.map((it) => ({
        productSku: it.productSku,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        kitchenInstructions: it.kitchenInstructions,
      })),
    };
    return { status: o.status as PrismaOrderStatus, order };
  },

  async updateStatus(id, next, actor, reason) {
    await prisma.order.update({
      where: { id },
      data: {
        status: next,
        ...(next === 'APPROVED' && actor
          ? { approvedById: actor, approvedAt: new Date() }
          : {}),
        ...(next === 'CANCELLED'
          ? {
              cancelledAt: new Date(),
              cancellationReason: reason ?? undefined,
            }
          : {}),
      },
    });
  },

  async appendStatusHistory(id, fromStatus, toStatus, actor, reason) {
    await prisma.statusHistoryEntry.create({
      data: {
        orderId: id,
        fromStatus: fromStatus ?? undefined,
        toStatus,
        actor: actor ?? 'system',
        reason: reason ?? undefined,
      },
    });
  },
};
