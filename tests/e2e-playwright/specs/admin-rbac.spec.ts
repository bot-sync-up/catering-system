import { test, expect } from '@playwright/test';
import { LoginPage, CrmPage } from '../pages';
import { loadJson, logout } from '../utils/helpers';

/**
 * בקרת הרשאות (RBAC):
 *  - לקוח קצה לא רואה את עמוד השכר
 *  - סוכן מכירות רואה רק לידים בבעלותו
 *  - אדמין רואה הכל
 */
test.describe('RBAC permissions', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  const users = loadJson<any>('users.json');

  test('customer cannot access payroll module', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(users.customer.email, users.customer.password);
    await login.expectLoggedIn();

    await page.goto('/payroll');
    await expect(page).toHaveURL(/forbidden|403|login|portal/);
    await expect(page.getByText(/אין הרשאה|גישה נדחתה|403/)).toBeVisible();
    await expect(page.getByText(/שכר|תלוש|ביטוח לאומי/)).toHaveCount(0);
  });

  test('agent sees only their own leads', async ({ page }) => {
    const login = new LoginPage(page);
    const crm = new CrmPage(page);
    await login.goto();
    await login.login(users.agent.email, users.agent.password);
    await login.expectLoggedIn();

    await page.goto('/leads');
    await expect(page.getByText('LEAD-1001')).toBeVisible();
    await expect(page.getByText('LEAD-1002')).toBeVisible();
    // Belongs to admin - must NOT be visible to the agent
    await expect(page.getByText('LEAD-1003')).toHaveCount(0);
  });

  test('admin sees all leads', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(users.admin.email, users.admin.password);
    await login.expectLoggedIn();

    await page.goto('/leads');
    await expect(page.getByText('LEAD-1001')).toBeVisible();
    await expect(page.getByText('LEAD-1002')).toBeVisible();
    await expect(page.getByText('LEAD-1003')).toBeVisible();
  });
});
