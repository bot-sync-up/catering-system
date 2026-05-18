import { test, expect } from '@playwright/test';
import { LoginPage, PortalPage } from '../pages';
import { loadJson, today } from '../utils/helpers';

/**
 * פורטל לקוחות — לקוח קצה:
 * התחברות → רשימת הזמנות → יצירת הזמנה חדשה → תשלום אונליין.
 *
 * רץ רק תחת project=portal (anchor: customer storage state).
 */
test.describe('Customer portal', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // fresh login per test

  const users = loadJson<any>('users.json');
  const menus = loadJson<any>('menus.json');

  test('login → view orders → create new order → online payment', async ({ page }) => {
    const login = new LoginPage(page);
    const portal = new PortalPage(page);

    await login.goto();
    await login.login(users.customer.email, users.customer.password);
    await login.expectLoggedIn();

    await portal.openOrders();
    await portal.expectOrderCount(0);

    await portal.startNewOrder();
    await portal.fillOrderForm({
      type: 'בר מצווה',
      date: today(45),
      guests: 120,
      menu: menus.menus.find((m: any) => m.id === 'MENU-BARMITZVAH').name,
    });

    await portal.payOnline({
      card: '4580458045804580',
      exp: '12/29',
      cvv: '123',
      holder: users.customer.fullName,
    });

    await page.goto('/orders');
    await expect(page.getByText(/בר מצווה/).first()).toBeVisible();
    await expect(page.getByText(/שולמה|מאושר/).first()).toBeVisible();
  });
});
