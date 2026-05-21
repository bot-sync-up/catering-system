import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  lazyConnect: true,
});

describe('Redis connection smoke', () => {
  beforeAll(async () => {
    await redis.connect();
  });

  afterAll(async () => {
    await redis.del('smoke:test', 'smoke:exp', 'smoke:counter');
    await redis.quit();
  });

  it('responds to PING with PONG', async () => {
    const reply = await redis.ping();
    expect(reply).toBe('PONG');
  });

  it('round-trips set/get', async () => {
    await redis.set('smoke:test', 'hello');
    const value = await redis.get('smoke:test');
    expect(value).toBe('hello');
  });

  it('honors EXPIRE / TTL', async () => {
    await redis.set('smoke:exp', '1', 'EX', 60);
    const ttl = await redis.ttl('smoke:exp');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('supports atomic increment', async () => {
    await redis.del('smoke:counter');
    const a = await redis.incr('smoke:counter');
    const b = await redis.incr('smoke:counter');
    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  it('reports server info', async () => {
    const info = await redis.info('server');
    expect(info).toMatch(/redis_version/);
  });
});
