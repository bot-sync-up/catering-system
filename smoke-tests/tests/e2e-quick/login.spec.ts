import { test, expect } from '@playwright/test';

const BASE = process.env.WEB_URL || 'http://localhost:3001';
const EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@demo.local';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin';

test('admin can log in and reach dashboard', async ({ page }) => {
  await page.goto(`${BASE}/login`);

  await expect(page).toHaveTitle(/login|התחבר|כניסה|sign in/i);

  await page.getByLabel(/email|אימייל|מייל/i).fill(EMAIL);
  await page.getByLabel(/password|סיסמ/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log ?in|sign ?in|התחבר|כניסה/i }).click();

  await page.waitForURL(/dashboard|home|\/$/, { timeout: 10000 });
  await expect(page.locator('body')).toContainText(/dashboard|לוח בקרה|ראשי|welcome|שלום/i);
});

test('invalid credentials show an error', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email|אימייל/i).fill(EMAIL);
  await page.getByLabel(/password|סיסמ/i).fill('wrong-password');
  await page.getByRole('button', { name: /log ?in|sign ?in|התחבר|כניסה/i }).click();

  await expect(page.locator('body')).toContainText(/invalid|error|שגיאה|שגוי|לא נכון/i, {
    timeout: 5000,
  });
});
