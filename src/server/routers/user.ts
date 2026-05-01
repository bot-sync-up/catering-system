import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const userRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    });
  }),
  me: publicProcedure.query(async ({ ctx }) => ctx.user),
});
