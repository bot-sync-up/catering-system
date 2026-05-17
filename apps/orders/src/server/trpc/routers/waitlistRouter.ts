import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { prisma } from '../../db';

export const waitlistRouter = router({
  add: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        eventDate: z.coerce.date(),
        eventName: z.string().optional(),
        guestCount: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const last = await prisma.waitlist.findFirst({
        where: { eventDate: input.eventDate },
        orderBy: { position: 'desc' },
      });
      const position = (last?.position ?? 0) + 1;
      return prisma.waitlist.create({
        data: { ...input, position },
      });
    }),

  list: publicProcedure
    .input(z.object({ eventDate: z.coerce.date() }))
    .query(({ input }) =>
      prisma.waitlist.findMany({
        where: { eventDate: input.eventDate },
        orderBy: { position: 'asc' },
        include: { customer: true },
      })
    ),
});
