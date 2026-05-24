import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import * as path from 'path';

export class KitchenPage extends BasePage {
  readonly uploadInput = this.page.locator('input[type="file"][accept*="image"], input[type="file"][accept*="pdf"]');
  readonly ocrPanel = this.page.getByTestId('ocr-result');
  readonly approveBtn = this.page.getByRole('button', { name: /אשר חשבונית|אישור/ });
  readonly inventoryTable = this.page.getByRole('table', { name: /מלאי/ });

  constructor(page: Page) {
    super(page);
  }

  async gotoIncoming() {
    await this.page.goto('/kitchen/invoices/incoming');
    await this.waitForIdle();
  }

  async uploadInvoice(filePath: string) {
    const abs = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, '..', filePath);
    await this.uploadInput.setInputFiles(abs);
    await this.toast(/הקובץ הועלה|מבצע OCR/);
  }

  async waitForOcr() {
    await expect(this.ocrPanel).toBeVisible({ timeout: 60_000 });
    await expect(this.ocrPanel.getByText(/מספר חשבונית|סכום|ספק/)).toBeVisible();
  }

  async verifyOcrFields(opts: { supplier: string; total: number; invoiceNumber: string }) {
    await expect(this.ocrPanel).toContainText(opts.supplier);
    await expect(this.ocrPanel).toContainText(String(opts.total));
    await expect(this.ocrPanel).toContainText(opts.invoiceNumber);
  }

  async correctField(label: string | RegExp, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  async approve() {
    await this.approveBtn.click();
    await this.toast(/אושרה|נקלטה למלאי/);
  }

  async expectInventoryRow(item: string) {
    await this.page.goto('/kitchen/inventory');
    await this.waitForIdle();
    await expect(this.inventoryTable.getByText(item)).toBeVisible();
  }
}
