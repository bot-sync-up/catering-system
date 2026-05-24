import { router } from '../trpc';
import { customerRouter } from './customer';
import { leadRouter } from './lead';
import { pipelineRouter } from './pipeline';
import { tagRouter } from './tag';
import { followUpRouter } from './followUp';
import { userRouter } from './user';
import { analyticsRouter } from './analytics';

export const appRouter = router({
  customer: customerRouter,
  lead: leadRouter,
  pipeline: pipelineRouter,
  tag: tagRouter,
  followUp: followUpRouter,
  user: userRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
