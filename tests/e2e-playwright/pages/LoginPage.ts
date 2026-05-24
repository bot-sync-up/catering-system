import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput = this.page.getByLabel(/אימייל|דוא"ל/);
  readonly passwordInput = this.page.getByLabel(/סיסמה/);
  readonly submitBtn = this.page.getByRole('button', { name: /התחבר|התחברות/ });
  readonly twoFaInput = this.page.getByLabel(/קוד אימות|2FA/);
  readonly twoFaSubmit = this.page.getByRole('button', { name: /אמת|אישור/ });
  readonly errorAlert = this.page.getByRole('alert');

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/login');
    await this.expectRtl();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }

  async submit2fa(code: string) {
    await this.twoFaInput.fill(code);
    await this.twoFaSubmit.click();
  }

  async expectErrorVisible(text: string | RegExp) {
    await expect(this.errorAlert).toContainText(text);
  }

  async expectLoggedIn() {
    await this.page.waitForURL((u) => !/login/.test(u.toString()), { timeout: 20_000 });
  }
}
