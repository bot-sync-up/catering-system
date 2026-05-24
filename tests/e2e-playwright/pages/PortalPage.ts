import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PortalPage extends BasePage {
  readonly ordersList = this.page.getByRole('list', { name: /הזמנות שלי/ });
  readonly newOrderBtn = this.page.getByRole('button', { name: /הזמנה חדשה/ });
  readonly logoutBtn = this.page.getByRole('button', { name: /התנתק|יציאה/ });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForIdle();
  }

  async openOrders() {
    await this.page.getByRole('link', { name: /ההזמנות שלי|הזמנות/ }).click();
    await this.waitForIdle();
  }

  async startNewOrder() {
    await this.newOrderBtn.click();
  }

  async fillOrderForm(opts: {
    type: string;
    date: string;
    guests: number;
    menu: string;
  }) {
    await this.page.getByLabel(/סוג האירוע/).selectOption({ label: opts.type });
    await this.page.getByLabel(/תאריך/).fill(opts.date);
    await this.page.getByLabel(/מספר אורחים/).fill(String(opts.guests));
    await this.page.getByRole('button', { name: opts.menu }).click();
    await this.clickByName(/המשך לתשלום/);
  }

  async payOnline(opts: { card: string; exp: string; cvv: string; holder: string }) {
    await this.page.getByLabel(/מספר כרטיס/).fill(opts.card);
    await this.page.getByLabel(/תוקף/).fill(opts.exp);
    await this.page.getByLabel(/CVV|קוד אבטחה/).fill(opts.cvv);
    await this.page.getByLabel(/בעל הכרטיס/).fill(opts.holder);
    await this.clickByName(/חיוב|תשלום/);
    await this.toast(/התשלום בוצע|תודה/);
  }

  async expectOrderCount(min: number) {
    const items = this.ordersList.getByRole('listitem');
    await expect(items).not.toHaveCount(0);
    expect(await items.count()).toBeGreaterThanOrEqual(min);
  }
}
