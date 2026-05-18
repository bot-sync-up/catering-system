import { chromium, FullConfig, request } from '@playwright/test';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * Global setup:
 *  1. Truncate + seed the test database (idempotent).
 *  2. Log in as admin and as customer; persist storage state for each project.
 */
async function globalSetup(_config: FullConfig) {
  const authDir = path.resolve(__dirname, '.auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  await seedDatabase();
  await loginAndSaveState({
    role: 'admin',
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
    baseURL: process.env.BASE_URL_WEB!,
    statePath: path.join(authDir, 'admin.json'),
  });
  await loginAndSaveState({
    role: 'customer',
    email: process.env.CUSTOMER_EMAIL!,
    password: process.env.CUSTOMER_PASSWORD!,
    baseURL: process.env.BASE_URL_PORTAL!,
    statePath: path.join(authDir, 'customer.json'),
  });
}

async function seedDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[setup] DATABASE_URL missing - skipping DB seed');
    return;
  }
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const seedSql = fs.readFileSync(path.resolve(__dirname, 'fixtures/seed.sql'), 'utf-8');
    await client.query(seedSql);
    console.log('[setup] DB seeded');
  } catch (err) {
    console.error('[setup] DB seed failed:', (err as Error).message);
    if (process.env.CI) throw err;
  } finally {
    await client.end().catch(() => undefined);
  }
}

interface LoginOpts {
  role: string;
  email: string;
  password: string;
  baseURL: string;
  statePath: string;
}

async function loginAndSaveState(opts: LoginOpts) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: opts.baseURL,
    locale: 'he-IL',
  });
  const page = await context.newPage();
  try {
    await page.goto('/login');
    await page.getByLabel(/אימייל|דוא"ל/).fill(opts.email);
    await page.getByLabel(/סיסמה/).fill(opts.password);
    await page.getByRole('button', { name: /התחבר|התחברות/ }).click();
    await page.waitForURL((u) => !/login/.test(u.toString()), { timeout: 20_000 });
    await context.storageState({ path: opts.statePath });
    console.log(`[setup] logged in as ${opts.role}`);
  } catch (err) {
    console.error(`[setup] login as ${opts.role} failed:`, (err as Error).message);
    fs.writeFileSync(opts.statePath, JSON.stringify({ cookies: [], origins: [] }, null, 2));
    if (process.env.CI) throw err;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
