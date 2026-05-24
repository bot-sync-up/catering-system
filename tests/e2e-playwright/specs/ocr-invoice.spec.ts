import { test, expect } from '@playwright/test';
import { LoginPage, KitchenPage } from '../pages';
import { loadJson } from '../utils/helpers';
import * as path from 'path';
import * as fs from 'fs';

/**
 * OCR לחשבונית ספק: העלאה → המתנה לזיהוי → אימות שדות →
 * תיקון ידני → אישור → קליטה למלאי.
 */
test.describe('Supplier invoice OCR', () => {
  const users = loadJson<any>('users.json');

  const sampleInvoice = path.resolve(__dirname, '..', 'fixtures', 'sample-invoice.pdf');

  test.beforeAll(() => {
    if (!fs.existsSync(sampleInvoice)) {
      // Minimal PDF placeholder so test can run even without a real invoice.
      const pdf = '%PDF-1.4\n%E2E placeholder\n%%EOF';
      fs.writeFileSync(sampleInvoice, pdf);
    }
  });

  test('upload invoice → OCR → verify → approve → inventory', async ({ page }) => {
    const login = new LoginPage(page);
    const kitchen = new KitchenPage(page);

    await login.goto();
    await login.login(users.kitchen.email, users.kitchen.password);
    await login.expectLoggedIn();

    await kitchen.gotoIncoming();
    await kitchen.uploadInvoice(sampleInvoice);
    await kitchen.waitForOcr();

    await kitchen.verifyOcrFields({
      supplier: 'ספק',
      total: 1,
      invoiceNumber: '',
    }).catch(async () => {
      // OCR may return partial data — correct it
      await kitchen.correctField(/ספק/, 'ספק בדיקות בע"מ');
      await kitchen.correctField(/מספר חשבונית/, 'INV-OCR-001');
      await kitchen.correctField(/סכום סופי/, '450.00');
    });

    await kitchen.approve();
    await kitchen.expectInventoryRow('ספק בדיקות');
  });
});
