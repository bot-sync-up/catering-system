/**
 * Session store ב-Redis — multi-device + force logout
 * מפתחות:
 *   sess:<sid>          → JSON של Session
 *   user:sessions:<uid> → SET של sids
 *   user:revoked:<uid>  → epoch (force-logout-all timestamp)
 */
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { Session } from '../types';
import { loadConfig } from '../config';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    const cfg = loadConfig();
    client = new Redis(cfg.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
  }
  return client;
}

export function setRedisClient(c: Redis | null): void {
  client = c;
}

const sessKey  = (sid: string) => `sess:${sid}`;
const userKey  = (uid: string) => `user:sessions:${uid}`;
const revKey   = (uid: string) => `user:revoked:${uid}`;

export interface CreateSessionInput {
  userId: string;
  device: string;
  ip: string;
  userAgent: string;
  twoFaPassed: boolean;
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const cfg = loadConfig();
  const r = getRedis();
  const now = Date.now();
  const sess: Session = {
    id: uuid(),
    userId: input.userId,
    device: input.device,
    ip: input.ip,
    userAgent: input.userAgent,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + cfg.SESSION_TTL_SEC * 1000,
    twoFaPassed: input.twoFaPassed,
    revoked: false,
  };
  const ttl = cfg.SESSION_TTL_SEC;
  await r.multi()
    .set(sessKey(sess.id), JSON.stringify(sess), 'EX', ttl)
    .sadd(userKey(input.userId), sess.id)
    .expire(userKey(input.userId), ttl)
    .exec();
  return sess;
}

export async function getSession(sid: string): Promise<Session | null> {
  const r = getRedis();
  const raw = await r.get(sessKey(sid));
  if (!raw) return null;
  const sess = JSON.parse(raw) as Session;
  // בדיקת force-logout-all
  const rev = await r.get(revKey(sess.userId));
  if (rev && Number(rev) > sess.createdAt) {
    return null;
  }
  if (sess.revoked || Date.now() > sess.expiresAt) return null;
  return sess;
}

export async function touchSession(sid: string): Promise<void> {
  const r = getRedis();
  const sess = await getSession(sid);
  if (!sess) return;
  sess.lastSeenAt = Date.now();
  const ttlMs = sess.expiresAt - Date.now();
  if (ttlMs <= 0) return;
  await r.set(sessKey(sid), JSON.stringify(sess), 'PX', ttlMs);
}

export async function markTwoFaPassed(sid: string): Promise<void> {
  const r = getRedis();
  const sess = await getSession(sid);
  if (!sess) return;
  sess.twoFaPassed = true;
  const ttlMs = sess.expiresAt - Date.now();
  if (ttlMs <= 0) return;
  await r.set(sessKey(sid), JSON.stringify(sess), 'PX', ttlMs);
}

export async function revokeSession(sid: string): Promise<void> {
  const r = getRedis();
  const raw = await r.get(sessKey(sid));
  if (!raw) return;
  const sess = JSON.parse(raw) as Session;
  await r.multi()
    .del(sessKey(sid))
    .srem(userKey(sess.userId), sid)
    .exec();
}

/** force logout בכל המכשירים */
export async function revokeAllForUser(userId: string): Promise<number> {
  const r = getRedis();
  const sids = await r.smembers(userKey(userId));
  const pipeline = r.multi();
  for (const sid of sids) pipeline.del(sessKey(sid));
  pipeline.del(userKey(userId));
  pipeline.set(revKey(userId), String(Date.now()), 'EX', loadConfig().SESSION_TTL_SEC);
  await pipeline.exec();
  return sids.length;
}

export async function listUserSessions(userId: string): Promise<Session[]> {
  const r = getRedis();
  const sids = await r.smembers(userKey(userId));
  const out: Session[] = [];
  for (const sid of sids) {
    const s = await getSession(sid);
    if (s) out.push(s);
  }
  return out;
}
