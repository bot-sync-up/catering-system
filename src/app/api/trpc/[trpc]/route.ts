import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '~/server/routers/_app';
import { createContext } from '~/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ headers: req.headers }),
    onError({ error, path }) {
      console.error(`[tRPC] ${path} -> ${error.message}`);
    },
  });

export { handler as GET, handler as POST };
