import { test, expect } from '@playwright/test';
import { LoginPage, CrmPage } from '../pages';
import { loadJson } from '../utils/helpers';

/**
 * Audit log:
 *  - כל שינוי משתמש/לקוח/הזמנה נרשם
 *  - אסור למחוק רשומות מהיומן (immutable)
 */
test.describe('Audit log', () => {
  const users = loadJson<any>('users.json');

  test('changes are recorded; entries cannot be deleted', async ({ page }) => {
    const login = new LoginPage(page);
    const crm = new CrmPage(page);

    await login.goto();
    await login.login(users.admin.email, users.admin.password);
    await login.expectLoggedIn();

    await crm.goto();
    const name = `audit-customer-${Date.now()}`;
    await crm.createCustomer({ name, phone: '0507778899' });

    await page.goto('/audit-log');
    const row = page.getByRole('row', { name: new RegExp(name) }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/יצירה|נוצר/);
    await expect(row).toContainText(users.admin.email);

    // Attempt deletion via UI: button must not exist
    await expect(page.getByRole('button', { name: /מחק/ })).toHaveCount(0);

    // Attempt deletion via API: must be rejected
    const apiResp = await page.request.delete('/api/audit-log/1', {
      failOnStatusCode: false,
    });
    expect([403, 405]).toContain(apiResp.status());
  });

  test('failed login attempt is logged', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(users.admin.email, 'wrong-password');
    await login.expectErrorVisible(/שגוי|כשל|לא נכון/);

    // Log in correctly to view audit log
    await login.login(users.admin.email, users.admin.password);
    await login.expectLoggedIn();

    await page.goto('/audit-log?filter=auth');
    await expect(
      page.getByRole('row', { name: /כשל התחברות|failed login/i }).first(),
    ).toBeVisible();
  });
});
