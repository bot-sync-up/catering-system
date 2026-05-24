import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages';
import { loadJson } from '../utils/helpers';

/**
 * שכר ונוכחות:
 *  - clock-in/out
 *  - חישוב שעות ועלויות עובד (הפרשות סוציאליות)
 *  - הפקת תלוש PDF
 *  - יצוא טופס 106
 */
test.describe('Payroll & time-tracking', () => {
  const users = loadJson<any>('users.json');

  test('clock-in → hours+deductions → payslip PDF → 106', async ({ page }) => {
    const login = new LoginPage(page);

    // Employee clocks in
    await login.goto();
    await login.login(users.employee.email, users.employee.password);
    await login.expectLoggedIn();

    await page.goto('/timeclock');
    await page.getByRole('button', { name: /כניסה|התחל יום/ }).click();
    await expect(page.getByText(/כניסה נרשמה|בעבודה/)).toBeVisible();

    // Simulated 8-hour workday
    await page.evaluate(() => window.localStorage.setItem('e2e_clock_offset_hours', '8'));

    await page.getByRole('button', { name: /יציאה|סיים יום/ }).click();
    await expect(page.getByText(/יציאה נרשמה|יום נסגר/)).toBeVisible();

    // Now act as payroll clerk
    await page.goto('/logout');
    await login.goto();
    await login.login(users.payroll.email, users.payroll.password);
    await login.expectLoggedIn();

    await page.goto('/payroll');
    await page.getByRole('cell', { name: users.employee.fullName }).click();

    await expect(page.getByTestId('hours-this-month')).toContainText(/\d+/);
    await expect(page.getByTestId('gross-salary')).toContainText(/\d+/);
    await expect(page.getByTestId('social-deductions')).toContainText(/ביטוח לאומי|מס הכנסה/);

    // Generate payslip
    const [payslip] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /הפק תלוש/ }).click(),
    ]);
    expect((await payslip.path()) ?? '').toBeTruthy();

    // Export 106
    const [form106] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /טופס 106/ }).click(),
    ]);
    expect((await form106.path()) ?? '').toBeTruthy();
  });
});
