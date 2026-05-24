import { router, publicProcedure, adminProcedure } from '../trpc';
import {
  createOrderSchema,
  cancelOrderSchema,
  transitionSchema,
} from '../schemas';
import { z } from 'zod';
import { prisma } from '../../db';
import { generateOrderNumber } from '@/domain/order/orderNumber';
import { OrderEngine } from '@/domain/order/engine';
import { prismaOrderRepo } from '../../repositories/prismaOrderRepo';
import { applyEffects } from '../../effects/applyEffects';
import { quoteRefund } from '@/domain/cancellation/policy';
import { buildRefundPlan } from '@/domain/cancellation/refunds';
import { planSwap } from '@/domain/cancellation/swap';

const engine = new OrderEngine(prismaOrderRepo);

export const orderRouter = router({
  /**
   * יוצר הזמנה במצב DRAFT.
   */
  create: publicProcedure
    .input(createOrderSchema)
    .mutation(async ({ input }) => {
      const customer = await prisma.customer.upsert({
        where: { phone: input.customer.phone },
        update: {
          fullName: input.customer.fullName,
          email: input.customer.email,
          address: input.customer.address,
          city: input.customer.city,
        },
        create: input.customer,
      });

      const subtotal = input.items.reduce(
        (s, it) => s + it.quantity * it.unitPrice,
        0
      );
      const taxAmount = +(subtotal * 0.18).toFixed(2);
      const totalAmount = +(subtotal + taxAmount).toFixed(2);

      const order = await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          type: input.type,
          channel: input.channel,
          status: 'DRAFT',
          customerId: customer.id,
          eventDate: input.eventDate,
          eventLocation: input.eventLocation,
          guestCount: input.guestCount,
          customerNotes: input.customerNotes,
          subtotal,
          taxAmount,
          totalAmount,
          items: {
            create: input.items.map((it) => ({
              productSku: it.productSku,
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: +(it.unitPrice * it.quantity).toFixed(2),
              kitchenInstructions: it.kitchenInstructions,
            })),
          },
        },
        include: { items: true },
      });

      return order;
    }),

  list: publicProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          customerId: z.string().optional(),
          limit: z.number().int().positive().max(200).default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return prisma.order.findMany({
        where: {
          status: input?.status as never,
          customerId: input?.customerId,
        },
        take: input?.limit ?? 50,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, items: true },
      });
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) =>
      prisma.order.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          items: true,
          payments: true,
          invoice: true,
          shipmentDoc: true,
          kitchenTasks: true,
          delivery: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      })
    ),

  /**
   * מעבר סטטוס כללי. רק מנהל יכול לעשות APPROVE/REJECT.
   */
  transition: publicProcedure
    .input(transitionSchema)
    .mutation(async ({ input, ctx }) => {
      if (
        (input.event.type === 'APPROVE' || input.event.type === 'REJECT') &&
        !ctx.isAdmin
      ) {
        throw new Error('רק מנהל רשאי לאשר/לדחות הזמנה');
      }
      const result = await engine.transition(input.orderId, input.event);
      await applyEffects(result.sideEffects);
      return result;
    }),

  /**
   * תמחור החזר (preview) — ללא ביטול בפועל.
   */
  quoteRefund: publicProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
      });
      if (!order) throw new Error('הזמנה לא נמצאה');
      if (!order.eventDate) {
        return {
          refundPercent: 100,
          refundAmount: order.totalAmount,
          hoursBefore: Infinity,
          appliedTier: null,
        };
      }
      return quoteRefund(order.totalAmount, order.eventDate);
    }),

  /**
   * מבטל הזמנה: מחשב החזר לפי מדיניות, יוצר תוכנית החזר, ומבצע מעבר ל-cancelled.
   * אם ניתן `swapToOrderId` — משלם בחלקו על הזמנה אחרת ולא מחזיר במלואו.
   */
  cancel: adminProcedure
    .input(cancelOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        include: { payments: true },
      });
      if (!order) throw new Error('הזמנה לא נמצאה');

      const refund = order.eventDate
        ? quoteRefund(order.totalAmount, order.eventDate)
        : { refundPercent: 100, refundAmount: order.totalAmount, hoursBefore: Infinity, appliedTier: null };

      let appliedRefund = refund.refundAmount;

      if (input.swapToOrderId) {
        const newOrder = await prisma.order.findUnique({
          where: { id: input.swapToOrderId },
        });
        if (!newOrder) throw new Error('הזמנה חדשה (להחלפה) לא נמצאה');
        const swap = planSwap({
          oldOrderTotal: order.totalAmount,
          refundAvailable: refund.refundAmount,
          newOrderTotal: newOrder.totalAmount,
        });
        appliedRefund = swap.amountToRefundCustomer;
        await prisma.order.update({
          where: { id: input.orderId },
          data: { swappedToOrderId: input.swapToOrderId },
        });
      }

      const plan = buildRefundPlan(
        order.payments.map((p) => ({
          id: p.id,
          method: p.method,
          amount: p.amount,
          status: p.status,
          checkDueDate: p.checkDueDate ?? null,
        })),
        appliedRefund
      );

      // עדכן payments — כל פריט בתוכנית
      for (const item of plan.items) {
        await prisma.payment.update({
          where: { id: item.paymentId },
          data: {
            status: item.amount === order.totalAmount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            refundAmount: item.amount,
            refundedAt: new Date(),
            refundMethod: item.refundMethod,
            ...(item.refundMethod === 'CHECK' && item.isCheckCancellation
              ? { refundCheckNumber: 'CANCELLED' }
              : {}),
          },
        });
      }

      const result = await engine.transition(input.orderId, {
        type: 'CANCEL',
        actor: ctx.userId ?? 'admin',
        reason: input.reason,
      });

      await prisma.order.update({
        where: { id: input.orderId },
        data: { refundAmount: appliedRefund },
      });

      await applyEffects(result.sideEffects);

      return {
        refundQuote: refund,
        appliedRefund,
        plan,
        transition: result,
      };
    }),
});
