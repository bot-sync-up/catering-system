import { prisma } from './db';
import type { User } from '@prisma/client';

export interface Context {
  prisma: typeof prisma;
  user: Pick<User, 'id' | 'email' | 'name' | 'role'> | null;
}

/**
 * Lightweight auth stub: in a real deployment, replace with NextAuth/JWT.
 * For now, we resolve a default user from a header or fall back to first admin.
 */
export async function createContext(opts: { headers: Headers }): Promise<Context> {
  const userIdHeader = opts.headers.get('x-user-id');
  let user = null;
  if (userIdHeader) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userIdHeader },
      select: { id: true, email: true, name: true, role: true },
    });
    user = dbUser;
  }
  if (!user) {
    user = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true, email: true, name: true, role: true },
    });
  }
  return { prisma, user };
}
