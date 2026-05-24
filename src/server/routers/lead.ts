import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { recomputeChurnAndUpsell } from '../services/scoring';

const leadCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  source: z.enum(['REFERRAL', 'ADVERTISEMENT', 'ORGANIC', 'EVENT', 'COLD_OUTREACH', 'PARTNER', 'WEBSITE', 'OTHER']).default('WEBSITE'),
  value: z.number().min(0).default(0),
  currency: z.string().default('ILS'),
  pipelineId: z.string(),
  stageId: z.string(),
  customerId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  referredById: z.string().optional().nullable(),
  expectedCloseAt: z.date().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmTerm: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
});

export const leadRouter = router({
  list: publicProcedure
    .input(
      z.object({
        pipelineId: z.string().optional(),
        ownerId: z.string().optional(),
        status: z.enum(['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
        source: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      const i = input ?? {};
      if (i.pipelineId) where.pipelineId = i.pipelineId;
      if (i.ownerId) where.ownerId = i.ownerId;
      if (i.status) where.status = i.status;
      if (i.source) where.source = i.source;
      if (i.search) where.title = { contains: i.search, mode: 'insensitive' };
      return ctx.prisma.lead.findMany({
        where,
        include: {
          stage: true,
          pipeline: true,
          customer: { select: { id: true, displayName: true, type: true } },
          owner: { select: { id: true, name: true, avatarUrl: true } },
          referredBy: { select: { id: true, displayName: true } },
        },
        orderBy: [{ stageId: 'asc' }, { positionInStage: 'asc' }],
      });
    }),

  byId: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const lead = await ctx.prisma.lead.findUnique({
      where: { id: input.id },
      include: {
        stage: true,
        pipeline: { include: { stages: { orderBy: { order: 'asc' } } } },
        customer: true,
        owner: { select: { id: true, name: true, avatarUrl: true } },
        followUps: { orderBy: { dueAt: 'asc' } },
        referredBy: true,
      },
    });
    if (!lead) throw new TRPCError({ code: 'NOT_FOUND' });
    return lead;
  }),

  // Kanban: grouped by stage
  board: publicProcedure
    .input(z.object({ pipelineId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let pipelineId = input?.pipelineId;
      if (!pipelineId) {
        const def = await ctx.prisma.pipeline.findFirst({ where: { isDefault: true } });
        pipelineId = def?.id ?? (await ctx.prisma.pipeline.findFirst())?.id;
      }
      if (!pipelineId) return { pipeline: null, stages: [] as any[] };
      const pipeline = await ctx.prisma.pipeline.findUnique({
        where: { id: pipelineId },
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: {
              leads: {
                orderBy: { positionInStage: 'asc' },
                include: {
                  customer: { select: { id: true, displayName: true } },
                  owner: { select: { id: true, name: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      });
      return { pipeline, stages: pipeline?.stages ?? [] };
    }),

  create: protectedProcedure.input(leadCreateSchema).mutation(async ({ ctx, input }) => {
    const stage = await ctx.prisma.stage.findUnique({ where: { id: input.stageId } });
    if (!stage) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Stage not found' });
    const last = await ctx.prisma.lead.findFirst({
      where: { stageId: input.stageId },
      orderBy: { positionInStage: 'desc' },
    });
    const lead = await ctx.prisma.lead.create({
      data: {
        ...input,
        positionInStage: (last?.positionInStage ?? 0) + 1,
      },
    });
    if (input.customerId) await recomputeChurnAndUpsell(ctx.prisma, input.customerId);
    return lead;
  }),

  update: protectedProcedure
    .input(leadCreateSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.lead.update({ where: { id }, data });
    }),

  // Move lead between/within stages (Kanban)
  move: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        toStageId: z.string(),
        toIndex: z.number().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.prisma.lead.findUnique({ where: { id: input.leadId } });
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND' });
      const toStage = await ctx.prisma.stage.findUnique({ where: { id: input.toStageId } });
      if (!toStage) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Stage not found' });

      // Re-position items in target stage
      const targetLeads = await ctx.prisma.lead.findMany({
        where: { stageId: input.toStageId, NOT: { id: input.leadId } },
        orderBy: { positionInStage: 'asc' },
      });
      const ordered = [...targetLeads];
      ordered.splice(input.toIndex, 0, lead as any);

      // Status side-effects
      let status = lead.status;
      let closedAt = lead.closedAt;
      if (toStage.isWon) { status = 'WON'; closedAt = new Date(); }
      else if (toStage.isLost) { status = 'LOST'; closedAt = new Date(); }
      else if (lead.status === 'NEW' && toStage.order > 1) status = 'CONTACTED';

      await ctx.prisma.$transaction([
        ctx.prisma.lead.update({
          where: { id: input.leadId },
          data: {
            stageId: input.toStageId,
            positionInStage: input.toIndex,
            status,
            closedAt,
          },
        }),
        ...ordered.map((l, idx) =>
          ctx.prisma.lead.update({
            where: { id: l.id },
            data: { positionInStage: idx },
          }),
        ),
        ctx.prisma.activity.create({
          data: {
            customerId: lead.customerId,
            actorId: ctx.user.id,
            kind: 'STAGE_CHANGED',
            payload: { from: lead.stageId, to: input.toStageId },
          },
        }),
      ]);

      if (lead.customerId) await recomputeChurnAndUpsell(ctx.prisma, lead.customerId);
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => ctx.prisma.lead.delete({ where: { id: input.id } })),
});
