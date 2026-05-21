import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';

const channel = `smoke:bus:${Date.now()}`;
const pub = new Redis({ host: process.env.REDIS_HOST || 'localhost' });
const sub = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

describe('Event bus smoke (pub/sub)', () => {
  afterAll(async () => {
    await pub.quit();
    await sub.quit();
  });

  it('publish → subscribe → ack round-trip', async () => {
    const received: string[] = [];

    await new Promise<void>((resolve) => {
      sub.subscribe(channel, () => resolve());
    });

    sub.on('message', (_ch, msg) => {
      received.push(msg);
      pub.publish(`${channel}:ack`, msg);
    });

    const ackPromise = new Promise<string>((resolve) => {
      const ackSub = new Redis({ host: process.env.REDIS_HOST || 'localhost' });
      ackSub.subscribe(`${channel}:ack`).then(() => {
        ackSub.on('message', (_ch, msg) => {
          resolve(msg);
          ackSub.quit();
        });
      });
    });

    await new Promise((r) => setTimeout(r, 100));
    const payload = JSON.stringify({ type: 'smoke.test', ts: Date.now() });
    await pub.publish(channel, payload);

    const ack = await Promise.race([
      ackPromise,
      new Promise<string>((_r, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
    ]);

    expect(received).toContain(payload);
    expect(ack).toBe(payload);
  });

  it('multiple subscribers all receive', async () => {
    const ch2 = `${channel}:multi`;
    const s2 = new Redis({ host: process.env.REDIS_HOST || 'localhost' });
    const s3 = new Redis({ host: process.env.REDIS_HOST || 'localhost' });
    await s2.subscribe(ch2);
    await s3.subscribe(ch2);

    const counts = { a: 0, b: 0 };
    s2.on('message', () => counts.a++);
    s3.on('message', () => counts.b++);

    await new Promise((r) => setTimeout(r, 100));
    const n = await pub.publish(ch2, 'fan-out');
    expect(n).toBe(2);

    await new Promise((r) => setTimeout(r, 200));
    expect(counts.a).toBe(1);
    expect(counts.b).toBe(1);

    await s2.quit();
    await s3.quit();
  });
});
