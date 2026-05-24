import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';

export const tagRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        kind: z.enum(['VIP', 'RETURNING', 'NEW', 'AT_RISK', 'CUSTOM']).default('CUSTOM'),
        color: z.string().default('#3b82f6'),
      }),
    )
    .mutation(async ({ ctx, input }) => ctx.prisma.tag.create({ data: input })),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => ctx.prisma.tag.delete({ where: { id: input.id } })),
});
