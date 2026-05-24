import { describe, it, expect, beforeAll } from 'vitest';

const API = process.env.API_URL || 'http://localhost:3000';

async function login(email: string, password: string) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await r.json();
  return body.accessToken as string;
}

async function authed(path: string, token: string) {
  const r = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

describe('RBAC enforcement smoke', () => {
  let adminToken = '';
  let customerToken = '';
  let employeeId = '';

  beforeAll(async () => {
    adminToken = await login(
      process.env.SEED_ADMIN_EMAIL || 'admin@demo.local',
      process.env.SEED_ADMIN_PASSWORD || 'admin'
    );
    customerToken = await login(
      process.env.SEED_CUSTOMER_EMAIL || 'customer@demo.local',
      process.env.SEED_CUSTOMER_PASSWORD || 'customer'
    );

    const emps = await authed('/employees', adminToken);
    employeeId = emps.body?.data?.[0]?.id || emps.body?.[0]?.id || '';
  });

  it('admin can read employee salary', async () => {
    if (!employeeId) return;
    const r = await authed(`/employees/${employeeId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.body.salary !== undefined || r.body.compensation !== undefined).toBe(true);
  });

  it('customer cannot read employee salary (403)', async () => {
    if (!employeeId) return;
    const r = await authed(`/employees/${employeeId}`, customerToken);
    expect([401, 403, 404]).toContain(r.status);
  });

  it('customer cannot list all employees', async () => {
    const r = await authed('/employees', customerToken);
    expect([401, 403]).toContain(r.status);
  });

  it('admin can access /audit-logs', async () => {
    const r = await authed('/audit-logs', adminToken);
    expect([200, 204]).toContain(r.status);
  });

  it('customer cannot access /audit-logs', async () => {
    const r = await authed('/audit-logs', customerToken);
    expect([401, 403]).toContain(r.status);
  });
});
