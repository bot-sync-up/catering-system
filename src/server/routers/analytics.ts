import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const analyticsRouter = router({
  // Customers at high risk of churn
  atRiskCustomers: publicProcedure
    .input(z.object({ threshold: z.number().min(0).max(1).default(0.6), limit: z.number().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const t = input?.threshold ?? 0.6;
      const limit = input?.limit ?? 20;
      return ctx.prisma.customer.findMany({
        where: { churnScore: { gte: t }, status: { in: ['ACTIVE', 'PROSPECT'] } },
        orderBy: { churnScore: 'desc' },
        take: limit,
        include: { tags: { include: { tag: true } } },
      });
    }),

  // Customers with high upsell potential
  upsellOpportunities: publicProcedure
    .input(z.object({ threshold: z.number().min(0).max(1).default(0.5), limit: z.number().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const t = input?.threshold ?? 0.5;
      const limit = input?.limit ?? 20;
      return ctx.prisma.customer.findMany({
        where: { upsellScore: { gte: t }, status: 'ACTIVE' },
        orderBy: { upsellScore: 'desc' },
        take: limit,
      });
    }),

  // Pipeline summary - $ per stage
  pipelineSummary: publicProcedure
    .input(z.object({ pipelineId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input?.pipelineId) where.pipelineId = input.pipelineId;
      const grouped = await ctx.prisma.lead.groupBy({
        by: ['stageId'],
        where,
        _sum: { value: true },
        _count: { _all: true },
      });
      const stages = await ctx.prisma.stage.findMany({
        where: input?.pipelineId ? { pipelineId: input.pipelineId } : undefined,
        orderBy: { order: 'asc' },
      });
      return stages.map((s) => {
        const g = grouped.find((x) => x.stageId === s.id);
        return {
          stage: s,
          count: g?._count._all ?? 0,
          totalValue: g?._sum.value ?? 0,
          weightedValue: (g?._sum.value ?? 0) * s.probability,
        };
      });
    }),

  // Lead source breakdown for marketing attribution
  sourceBreakdown: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.lead.groupBy({
      by: ['source'],
      _count: { _all: true },
      _sum: { value: true },
    });
  }),
});
