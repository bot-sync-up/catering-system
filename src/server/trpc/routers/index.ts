import { router } from '../trpc';
import { orderRouter } from './orderRouter';
import { waitlistRouter } from './waitlistRouter';

export const appRouter = router({
  order: orderRouter,
  waitlist: waitlistRouter,
});

export type AppRouter = typeof appRouter;
