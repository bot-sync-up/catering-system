import { cookies } from 'next/headers';
import { db, uid, type User } from './store';

const COOKIE = 'cp_sid';

export async function setSession(userId: string) {
  const sid = uid('sid');
  db().sessions.set(sid, userId);
  const c = await cookies();
  c.set(COOKIE, sid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSession() {
  const c = await cookies();
  const sid = c.get(COOKIE)?.value;
  if (sid) db().sessions.delete(sid);
  c.delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const c = await cookies();
  const sid = c.get(COOKIE)?.value;
  if (!sid) return null;
  const userId = db().sessions.get(sid);
  if (!userId) return null;
  return db().users.get(userId) ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error('UNAUTHENTICATED');
  return u;
}
