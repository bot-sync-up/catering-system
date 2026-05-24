import { FullConfig } from '@playwright/test';
import { Client } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * Global teardown:
 *  1. Remove test rows added by specs (anything tagged with metadata.e2e = true).
 *  2. Optionally remove auth state files if KEEP_AUTH != 'true'.
 */
async function globalTeardown(_config: FullConfig) {
  await cleanupDatabase();
  cleanupAuth();
}

async function cleanupDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(`DELETE FROM orders WHERE metadata->>'e2e' = 'true';`);
    await client.query(`DELETE FROM invoices WHERE metadata->>'e2e' = 'true';`);
    await client.query(`DELETE FROM events WHERE metadata->>'e2e' = 'true';`);
    await client.query(`DELETE FROM payments WHERE metadata->>'e2e' = 'true';`);
    console.log('[teardown] DB cleaned');
  } catch (err) {
    console.warn('[teardown] DB cleanup skipped:', (err as Error).message);
  } finally {
    await client.end().catch(() => undefined);
  }
}

function cleanupAuth() {
  if (process.env.KEEP_AUTH === 'true') return;
  const authDir = path.resolve(__dirname, '.auth');
  if (fs.existsSync(authDir)) {
    for (const f of fs.readdirSync(authDir)) {
      fs.unlinkSync(path.join(authDir, f));
    }
  }
}

export default globalTeardown;
