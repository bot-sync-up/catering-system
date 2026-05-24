import { test, expect } from '@playwright/test';
import { LoginPage, CrmPage, OrdersPage } from '../pages';
import { loadJson } from '../utils/helpers';

/**
 * ביטול אירוע + החזר כספי. מאמת שהמערכת:
 *  1) משנה סטטוס הזמנה ל"בוטלה"
 *  2) יוצרת מסמך זיכוי
 *  3) רושמת אירוע ב-audit log
 */
test.describe('Cancellation & refund flow', () => {
  const users = loadJson<any>('users.json');
  const menus = loadJson<any>('menus.json');
  const events = loadJson<any>('events.json');
  const event = events.events.find((e: any) => e.id === 'EVT-CANCELLED');
  const menu = menus.menus.find((m: any) => m.id === 'MENU-WEDDING-CLASSIC');

  test('cancel order and refund deposit', async ({ page }) => {
    const login = new LoginPage(page);
    const crm = new CrmPage(page);
    const orders = new OrdersPage(page);

    await login.goto();
    await login.login(users.admin.email, users.admin.password);
    await login.expectLoggedIn();

    await crm.goto();
    const customerName = `לקוח לביטול ${Date.now()}`;
    await crm.createCustomer({ name: customerName, phone: '0501010101' });
    await crm.openCustomer(customerName);

    await orders.createEvent({
      type: event.type,
      date: event.date,
      guests: event.guests,
      hall: event.hall,
    });
    await orders.selectMenu(menu.name);
    await orders.setGuestCount(event.guests);
    await orders.payDownPayment(event.downPayment, 'אשראי');

    await orders.cancelOrder(event.cancellationReason);
    await orders.refund(event.downPayment);

    await expect(page.getByText(/בוטלה|מבוטל/)).toBeVisible();
    await expect(page.getByText(/חשבונית זיכוי|זיכוי/)).toBeVisible();

    // Audit trail entry exists
    await page.goto('/audit-log');
    await expect(
      page.getByRole('row', { name: /ביטול/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('row', { name: /החזר/ }).first(),
    ).toBeVisible();
  });
});
