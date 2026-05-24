import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages';
import { loadJson } from '../utils/helpers';
import { generateTotp } from '../utils/totp';

/**
 * 2FA לאדמין:
 *  - לוגין ללא קוד 2FA נחסם
 *  - לוגין עם קוד שגוי נחסם
 *  - לוגין עם קוד תקין מצליח
 */
test.describe('Admin 2FA enforcement', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  const users = loadJson<any>('users.json');

  test('blocked without 2FA code', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(users.admin.email, users.admin.password);

    // Should land on 2FA challenge page, NOT logged in
    await expect(page).toHaveURL(/2fa|otp|verify/);
    await expect(page.getByLabel(/קוד אימות|2FA/)).toBeVisible();

    // Try to bypass by navigating directly
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/2fa|login|verify/);
  });

  test('blocked with invalid code', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(users.admin.email, users.admin.password);
    await login.submit2fa('000000');
    await login.expectErrorVisible(/קוד שגוי|לא תקין/);
    await expect(page).not.toHaveURL(/dashboard|home|crm/);
  });

  test('succeeds with valid TOTP code', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(users.admin.email, users.admin.password);
    const code = generateTotp(users.admin.twoFaSecret);
    await login.submit2fa(code);
    await login.expectLoggedIn();
    await expect(page).toHaveURL(/dashboard|home|crm/);
  });
});
