import { test, expect } from '@playwright/test';
import { LoginPage, CrmPage, OrdersPage, InvoicePage } from '../pages';
import { loadJson } from '../utils/helpers';

/**
 * מנוי חודשי לבית ספר: יצירת לקוח עסקי, מנוי חודשי, חיוב ראשון,
 * הפקת חשבונית חודשית, וידוא יצירת חיוב מחזורי הבא.
 */
test.describe('Subscription — monthly school plan', () => {
  const users = loadJson<any>('users.json');
  const events = loadJson<any>('events.json');
  const sub = events.subscriptions[0];

  test('school recurring subscription billing', async ({ page }) => {
    const login = new LoginPage(page);
    const crm = new CrmPage(page);
    const orders = new OrdersPage(page);
    const invoices = new InvoicePage(page);

    await login.goto();
    await login.login(users.admin.email, users.admin.password);
    await login.expectLoggedIn();

    await crm.goto();
    const schoolName = `בית ספר ${Date.now()}`;
    await crm.createCustomer({
      name: schoolName,
      phone: users.school.phone,
      email: users.school.email,
      address: 'רחוב הרב קוק 5, בני ברק',
    });
    await crm.openCustomer(schoolName);

    await orders.createSubscription({
      plan: sub.plan,
      price: sub.price,
      cycle: 'חודשי',
    });

    // First charge happens immediately
    await orders.payDownPayment(sub.price, 'העברה');

    await invoices.goto();
    await expect(
      page.getByRole('row', { name: new RegExp(schoolName) }).first(),
    ).toBeVisible();

    // Verify next billing date is scheduled
    await page.goto('/subscriptions');
    const row = page.getByRole('row', { name: new RegExp(schoolName) });
    await expect(row).toContainText(/חיוב הבא|next billing/i);
    await expect(row).toContainText(/חודשי/);
  });
});
