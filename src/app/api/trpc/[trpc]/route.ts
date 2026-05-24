import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/routers';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({
      userId: req.headers.get('x-user-id') ?? undefined,
      userName: req.headers.get('x-user-name') ?? undefined,
      isAdmin: req.headers.get('x-admin') === '1',
    }),
  });

export { handler as GET, handler as POST };
