import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const BASE_URL_WEB = process.env.BASE_URL_WEB || 'http://localhost:3000';
const BASE_URL_PORTAL = process.env.BASE_URL_PORTAL || 'http://localhost:3001';
const HEADLESS = process.env.HEADLESS !== 'false';
const SLOW_MO = Number(process.env.SLOW_MO || 0);

/**
 * Playwright configuration for the RTL-Hebrew CRM/ERP platform.
 *
 * Projects:
 *  - web      → desktop chromium against the back-office app
 *  - mobile   → mobile chromium against the back-office app
 *  - portal   → desktop chromium against the customer portal
 */
export default defineConfig({
  testDir: './specs',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: Number(process.env.RETRIES ?? (process.env.CI ? 2 : 1)),
  workers: Number(process.env.WORKERS ?? (process.env.CI ? 2 : undefined)),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  globalSetup: require.resolve('./setup'),
  globalTeardown: require.resolve('./teardown'),
  use: {
    headless: HEADLESS,
    launchOptions: { slowMo: SLOW_MO },
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: path.resolve(__dirname, '.auth/admin.json'),
    extraHTTPHeaders: {
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    },
  },
  projects: [
    {
      name: 'web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL_WEB,
        viewport: { width: 1440, height: 900 },
      },
      testIgnore: ['**/customer-portal.spec.ts'],
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        baseURL: BASE_URL_WEB,
      },
      testMatch: [
        '**/wedding-700.spec.ts',
        '**/customer-portal.spec.ts',
        '**/payroll.spec.ts',
      ],
    },
    {
      name: 'portal',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL_PORTAL,
        storageState: path.resolve(__dirname, '.auth/customer.json'),
      },
      testMatch: ['**/customer-portal.spec.ts'],
    },
  ],
});
