import { test, expect } from '@playwright/test';
import { LoginPage, CrmPage, OrdersPage, InvoicePage } from '../pages';
import { loadJson, today } from '../utils/helpers';

/**
 * חתונה 700 איש — מסלול מלא:
 * לוגין → לקוח → אירוע → תפריט → 700 מנות → מקדמה → ביצוע → חשבונית מס → תשלום סופי → דיבריף.
 */
test.describe('Wedding 700 — full lifecycle', () => {
  const users = loadJson<any>('users.json');
  const menus = loadJson<any>('menus.json');
  const events = loadJson<any>('events.json');
  const wedding = events.events.find((e: any) => e.id === 'EVT-WEDDING-700');
  const premium = menus.menus.find((m: any) => m.id === 'MENU-WEDDING-PREMIUM');

  test('700 guests wedding: lead → debrief', async ({ page }) => {
    test.slow();
    const login = new LoginPage(page);
    const crm = new CrmPage(page);
    const orders = new OrdersPage(page);
    const invoices = new InvoicePage(page);

    await login.goto();
    await login.login(users.admin.email, users.admin.password);
    await login.expectLoggedIn();

    await crm.goto();
    const customerName = `משפחת חתן ${Date.now()}`;
    await crm.createCustomer({
      name: customerName,
      phone: '0509998888',
      email: `bride.${Date.now()}@test.local`,
      address: 'הרצל 100, ירושלים',
    });
    await crm.expectCustomerListed(customerName);
    await crm.openCustomer(customerName);

    await orders.createEvent({
      type: 'חתונה',
      date: wedding.date,
      guests: wedding.guests,
      hall: wedding.hall,
      notes: wedding.notes,
    });
    await orders.selectMenu(premium.name);
    await orders.setGuestCount(wedding.guests);
    await orders.expectTotalGreaterThan(premium.pricePerPerson * wedding.guests * 0.9);

    await orders.payDownPayment(wedding.downPayment, 'אשראי');
    await orders.moveToExecution();
    await orders.issueTaxInvoice();

    await invoices.goto();
    const invoiceRow = page.getByRole('row', { name: new RegExp(customerName) }).first();
    await expect(invoiceRow).toBeVisible();
    await expect(invoiceRow).toContainText(/חשבונית מס/);

    await page.goBack();
    await orders.payRemaining(wedding.expectedTotal - wedding.downPayment);
    await orders.runDebrief({
      rating: 5,
      notes: 'אירוע מצליח, ללא תקלות, הלקוח מרוצה',
    });

    await expect(page.getByText(/האירוע נסגר|דיבריף נשמר/)).toBeVisible();
  });
});
