import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class InvoicePage extends BasePage {
  readonly invoicesTable = this.page.getByRole('table', { name: /חשבוניות/ });
  readonly downloadPdfBtn = this.page.getByRole('button', { name: /הורד PDF|חשבונית PDF/ });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/invoices');
    await this.waitForIdle();
  }

  async open(invoiceNumber: string) {
    await this.page.getByRole('cell', { name: invoiceNumber }).click();
    await this.waitForIdle();
  }

  async expectTaxInvoiceVisible(invoiceNumber: string) {
    const row = this.invoicesTable.getByRole('row', { name: new RegExp(invoiceNumber) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(/חשבונית מס/);
  }

  async downloadPdf() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.downloadPdfBtn.click(),
    ]);
    const path = await download.path();
    expect(path).toBeTruthy();
    return path!;
  }

  async expectAmount(amount: number) {
    const txt = await this.page.getByTestId('invoice-total').textContent();
    const value = Number(String(txt).replace(/[^\d.]/g, ''));
    expect(value).toBe(amount);
  }
}
