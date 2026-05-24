import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage — locators are RTL-Hebrew aware.
 * All page objects extend this class.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected get dirRtl() {
    return this.page.locator('html[dir="rtl"]');
  }

  async expectRtl() {
    await expect(this.dirRtl).toBeVisible();
  }

  async toast(text: string | RegExp) {
    const t = this.page.getByRole('alert').filter({ hasText: text });
    await expect(t).toBeVisible({ timeout: 10_000 });
  }

  async clickByName(name: string | RegExp) {
    await this.page.getByRole('button', { name }).click();
  }

  async linkByName(name: string | RegExp) {
    await this.page.getByRole('link', { name }).click();
  }

  async fillByLabel(label: string | RegExp, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  /** Wait for spinners/loaders to disappear. */
  async waitForIdle() {
    const spinner = this.page.locator('[role="progressbar"], .loading, [data-testid="spinner"]');
    await spinner.first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
    await this.page.waitForLoadState('networkidle').catch(() => undefined);
  }
}
