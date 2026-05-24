import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const FIXTURE_DIR = path.resolve(__dirname, '..', 'fixtures');

export function loadJson<T = any>(name: string): T {
  const file = path.join(FIXTURE_DIR, name);
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

export function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/אימייל|דוא"ל/).fill(email);
  await page.getByLabel(/סיסמה/).fill(password);
  await page.getByRole('button', { name: /התחבר|התחברות/ }).click();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /חשבון|פרופיל/ }).click();
  await page.getByRole('menuitem', { name: /התנתק|יציאה/ }).click();
  await page.waitForURL(/login/);
}

export async function expectRtl(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
}

export function tag(metadata: Record<string, any> = {}) {
  return { ...metadata, e2e: true };
}
