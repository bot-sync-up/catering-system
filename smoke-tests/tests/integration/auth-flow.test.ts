import { describe, it, expect } from 'vitest';

const API = process.env.API_URL || 'http://localhost:3000';

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, headers: res.headers };
}

describe('Auth flow smoke', () => {
  const email = `smoke+${Date.now()}@example.com`;
  const password = 'P@ssw0rd!smoke-test-123';
  let accessToken = '';
  let refreshToken = '';

  it('register creates user (201)', async () => {
    const r = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name: 'Smoke Test', tenantSlug: 'demo' }),
    });
    expect([200, 201]).toContain(r.status);
  });

  it('login returns JWT pair', async () => {
    const r = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    expect(r.status).toBe(200);
    expect(r.body.accessToken).toBeTruthy();
    expect(r.body.refreshToken).toBeTruthy();
    accessToken = r.body.accessToken;
    refreshToken = r.body.refreshToken;
  });

  it('authenticated /me works with JWT', async () => {
    const r = await api('/me', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(r.status).toBe(200);
    expect(r.body.email).toBe(email);
  });

  it('refresh issues new access token', async () => {
    const r = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    expect(r.status).toBe(200);
    expect(r.body.accessToken).toBeTruthy();
    expect(r.body.accessToken).not.toBe(accessToken);
  });

  it('logout invalidates session', async () => {
    const r = await api('/auth/logout', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect([200, 204]).toContain(r.status);

    const me = await api('/me', { headers: { authorization: `Bearer ${accessToken}` } });
    expect(me.status).toBe(401);
  });

  it('invalid password rejected (401)', async () => {
    const r = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'wrong-password' }),
    });
    expect(r.status).toBe(401);
  });
});
