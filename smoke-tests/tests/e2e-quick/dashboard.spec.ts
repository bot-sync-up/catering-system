import { test, expect } from '@playwright/test';

const BASE = process.env.WEB_URL || 'http://localhost:3001';
const EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@demo.local';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin';

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email|אימייל/i).fill(EMAIL);
  await page.getByLabel(/password|סיסמ/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log ?in|sign ?in|התחבר|כניסה/i }).click();
  await page.waitForURL(/dashboard|home|\/$/, { timeout: 10000 });
});

test('dashboard loads with key widgets', async ({ page }) => {
  await page.goto(`${BASE}/dashboard`);

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('body')).toContainText(/אירועים|לקוחות|הכנסות|events|customers|revenue/i);
});

test('navigation to events page works', async ({ page }) => {
  await page.goto(`${BASE}/dashboard`);
  await page.getByRole('link', { name: /events|אירועים/i }).first().click();
  await page.waitForURL(/events/, { timeout: 5000 });
  await expect(page.locator('body')).toContainText(/אירוע|event/i);
});

test('no console errors on dashboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState('networkidle');

  const significant = errors.filter(
    (e) => !/favicon|hydration|warning|ResizeObserver/i.test(e)
  );
  expect(significant).toEqual([]);
});
