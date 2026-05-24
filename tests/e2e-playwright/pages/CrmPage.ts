import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CrmPage extends BasePage {
  readonly newCustomerBtn = this.page.getByRole('button', { name: /לקוח חדש|הוסף לקוח/ });
  readonly searchInput = this.page.getByPlaceholder(/חיפוש לקוח/);
  readonly customersTable = this.page.getByRole('table', { name: /לקוחות/ });
  readonly leadsTable = this.page.getByRole('table', { name: /לידים/ });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/crm');
    await this.waitForIdle();
  }

  async createCustomer(opts: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  }) {
    await this.newCustomerBtn.click();
    await this.fillByLabel(/שם מלא|שם הלקוח/, opts.name);
    await this.fillByLabel(/טלפון/, opts.phone);
    if (opts.email) await this.fillByLabel(/אימייל|דוא"ל/, opts.email);
    if (opts.address) await this.fillByLabel(/כתובת/, opts.address);
    await this.clickByName(/שמור|הוסף/);
    await this.toast(/נשמר בהצלחה|נוצר/);
  }

  async openCustomer(name: string) {
    await this.searchInput.fill(name);
    await this.page.getByRole('cell', { name }).click();
    await this.waitForIdle();
  }

  async expectCustomerListed(name: string) {
    await expect(this.customersTable.getByText(name)).toBeVisible();
  }

  async expectNotVisible(text: string | RegExp) {
    await expect(this.page.getByText(text)).toHaveCount(0);
  }
}
