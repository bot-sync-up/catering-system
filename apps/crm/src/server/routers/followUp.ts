import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { scheduleReminder } from '../queues';

export const followUpRouter = router({
  list: publicProcedure
    .input(
      z.object({
        ownerId: z.string().optional(),
        customerId: z.string().optional(),
        leadId: z.string().optional(),
        status: z.enum(['PENDING', 'DONE', 'SNOOZED', 'CANCELLED']).optional(),
        upcomingOnly: z.boolean().default(false),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      const i = input ?? {};
      if (i.ownerId) where.ownerId = i.ownerId;
      if (i.customerId) where.customerId = i.customerId;
      if (i.leadId) where.leadId = i.leadId;
      if (i.status) where.status = i.status;
      if (i.upcomingOnly) where.dueAt = { gte: new Date() };
      return ctx.prisma.followUp.findMany({
        where,
        orderBy: { dueAt: 'asc' },
        include: {
          customer: { select: { id: true, displayName: true } },
          lead: { select: { id: true, title: true } },
          owner: { select: { id: true, name: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        body: z.string().optional(),
        dueAt: z.date(),
        customerId: z.string().optional(),
        leadId: z.string().optional(),
        ownerId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const fu = await ctx.prisma.followUp.create({
        data: { ...input, ownerId: input.ownerId ?? ctx.user.id },
      });
      await scheduleReminder(fu.id, fu.dueAt);
      return fu;
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) =>
      ctx.prisma.followUp.update({ where: { id: input.id }, data: { status: 'DONE' } }),
    ),

  snooze: protectedProcedure
    .input(z.object({ id: z.string(), until: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const fu = await ctx.prisma.followUp.update({
        where: { id: input.id },
        data: { status: 'SNOOZED', dueAt: input.until, reminded: false },
      });
      await scheduleReminder(fu.id, fu.dueAt);
      return fu;
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) =>
      ctx.prisma.followUp.update({ where: { id: input.id }, data: { status: 'CANCELLED' } }),
    ),
});
