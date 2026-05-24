import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';

export const pipelineRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.pipeline.findMany({
      include: { stages: { orderBy: { order: 'asc' } }, _count: { select: { leads: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isDefault: z.boolean().default(false),
        stages: z
          .array(
            z.object({
              name: z.string(),
              probability: z.number().min(0).max(1).default(0),
              isWon: z.boolean().default(false),
              isLost: z.boolean().default(false),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.isDefault) {
        await ctx.prisma.pipeline.updateMany({ data: { isDefault: false } });
      }
      return ctx.prisma.pipeline.create({
        data: {
          name: input.name,
          description: input.description,
          isDefault: input.isDefault,
          stages: { create: input.stages.map((s, i) => ({ ...s, order: i + 1 })) },
        },
        include: { stages: true },
      });
    }),

  addStage: protectedProcedure
    .input(
      z.object({
        pipelineId: z.string(),
        name: z.string(),
        probability: z.number().min(0).max(1).default(0),
        isWon: z.boolean().default(false),
        isLost: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.prisma.stage.findFirst({
        where: { pipelineId: input.pipelineId },
        orderBy: { order: 'desc' },
      });
      return ctx.prisma.stage.create({
        data: { ...input, order: (last?.order ?? 0) + 1 },
      });
    }),

  reorderStages: protectedProcedure
    .input(z.object({ pipelineId: z.string(), stageIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.stageIds.map((id, idx) =>
          ctx.prisma.stage.update({ where: { id }, data: { order: idx + 1 } }),
        ),
      );
      return { ok: true };
    }),
});
