import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  })),
  echo: publicProcedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => ({ echo: input.message })),
});

export type AppRouter = typeof appRouter;
