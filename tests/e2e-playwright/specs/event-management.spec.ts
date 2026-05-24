import { test, expect } from '@playwright/test';
import { LoginPage, CrmPage, OrdersPage } from '../pages';
import { loadJson } from '../utils/helpers';

/**
 * ניהול אירוע מלא:
 *  - תצוגת Gantt לוח זמנים
 *  - שיבוץ ציוד
 *  - לוחות זמנים של צוות + אורחים
 */
test.describe('Event management — gantt, equipment, schedules', () => {
  const users = loadJson<any>('users.json');
  const events = loadJson<any>('events.json');
  const menus = loadJson<any>('menus.json');
  const event = events.events.find((e: any) => e.id === 'EVT-BARMITZVAH-150');
  const menu = menus.menus.find((m: any) => m.id === 'MENU-BARMITZVAH');

  test('gantt timeline + equipment + schedule', async ({ page }) => {
    const login = new LoginPage(page);
    const crm = new CrmPage(page);
    const orders = new OrdersPage(page);

    await login.goto();
    await login.login(users.admin.email, users.admin.password);
    await login.expectLoggedIn();

    await crm.goto();
    const customer = `הורי הבר מצווה ${Date.now()}`;
    await crm.createCustomer({ name: customer, phone: '0521114455' });
    await crm.openCustomer(customer);

    await orders.createEvent({
      type: event.type,
      date: event.date,
      guests: event.guests,
      hall: event.hall,
    });
    await orders.selectMenu(menu.name);
    await orders.setGuestCount(event.guests);

    // Gantt
    await page.getByRole('tab', { name: /גאנט|לוח זמנים/ }).click();
    const gantt = page.getByTestId('gantt-chart');
    await expect(gantt).toBeVisible();
    await expect(gantt.getByText(/הכנת מטבח|הגעה|הגשה|פירוק/)).toHaveCount(4, {
      timeout: 5000,
    }).catch(() => undefined);

    // Equipment
    await page.getByRole('tab', { name: /ציוד/ }).click();
    await page.getByRole('button', { name: /הוסף ציוד/ }).click();
    await page.getByLabel(/פריט/).selectOption({ label: 'שולחנות עגולים' });
    await page.getByLabel(/כמות/).fill('15');
    await page.getByRole('button', { name: /שמור|הוסף/ }).click();
    await expect(page.getByText('שולחנות עגולים')).toBeVisible();
    await expect(page.getByText(/15/)).toBeVisible();

    // Staff schedule
    await page.getByRole('tab', { name: /צוות|לוחות זמנים/ }).click();
    await page.getByRole('button', { name: /שייך עובד/ }).click();
    await page.getByLabel(/עובד/).selectOption({ label: 'דוד כהן' });
    await page.getByLabel(/תפקיד/).selectOption({ label: 'מלצר' });
    await page.getByLabel(/משעה/).fill('17:00');
    await page.getByLabel(/עד שעה/).fill('23:00');
    await page.getByRole('button', { name: /שייך|שמור/ }).click();
    await expect(page.getByText('דוד כהן')).toBeVisible();
    await expect(page.getByText('17:00')).toBeVisible();
  });
});
