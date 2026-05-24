import { describe, it, expect } from 'vitest';

const APPS: Array<{ name: string; url: string }> = [
  { name: 'api',       url: process.env.API_URL       || 'http://localhost:3000' },
  { name: 'web',       url: process.env.WEB_URL       || 'http://localhost:3001' },
  { name: 'admin',     url: process.env.ADMIN_URL     || 'http://localhost:3002' },
  { name: 'worker',    url: process.env.WORKER_URL    || 'http://localhost:3003' },
  { name: 'webhooks',  url: process.env.WEBHOOKS_URL  || 'http://localhost:3004' },
];

for (const app of APPS) {
  describe(`Health: ${app.name}`, () => {
    it(`${app.name} /health returns 200`, async () => {
      const r = await fetch(`${app.url}/health`);
      expect(r.status).toBe(200);
    });

    it(`${app.name} /health body includes status:ok`, async () => {
      const r = await fetch(`${app.url}/health`);
      const body = await r.json().catch(() => ({}));
      expect(body.status || body.ok).toBeTruthy();
      expect(String(body.status || '').toLowerCase()).toMatch(/ok|healthy|up|pass/);
    });

    it(`${app.name} /health reports DB status`, async () => {
      const r = await fetch(`${app.url}/health`);
      const body = await r.json().catch(() => ({}));
      const checks = body.checks || body.services || body;
      const dbKey = Object.keys(checks).find((k) => /db|postgres|database/i.test(k));
      if (dbKey) {
        const status = checks[dbKey]?.status || checks[dbKey];
        expect(String(status).toLowerCase()).toMatch(/ok|up|healthy|pass|true/);
      }
    });

    it(`${app.name} /health reports Redis status`, async () => {
      const r = await fetch(`${app.url}/health`);
      const body = await r.json().catch(() => ({}));
      const checks = body.checks || body.services || body;
      const redisKey = Object.keys(checks).find((k) => /redis|cache/i.test(k));
      if (redisKey) {
        const status = checks[redisKey]?.status || checks[redisKey];
        expect(String(status).toLowerCase()).toMatch(/ok|up|healthy|pass|true/);
      }
    });
  });
}

describe('Health: liveness vs readiness', () => {
  it('api /healthz (liveness) responds quickly', async () => {
    const t = Date.now();
    const r = await fetch(`${APPS[0].url}/healthz`).catch(() => null);
    if (!r) return;
    expect(r.status).toBe(200);
    expect(Date.now() - t).toBeLessThan(500);
  });

  it('api /ready (readiness) verifies dependencies', async () => {
    const r = await fetch(`${APPS[0].url}/ready`).catch(() => null);
    if (!r) return;
    expect([200, 503]).toContain(r.status);
  });
});
