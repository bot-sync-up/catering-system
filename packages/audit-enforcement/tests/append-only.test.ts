/**
 * tests/append-only.test.ts
 *
 * בדיקה אינטגרציה — דורש Postgres מקומי (DATABASE_URL).
 * אם משתנה הסביבה לא מוגדר — הבדיקה מדולגת.
 *
 * נבדק:
 *   - INSERT ל-AuditLog מצליח
 *   - UPDATE זורק שגיאה
 *   - DELETE זורק שגיאה
 *   - TRUNCATE זורק שגיאה
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = !process.env.DATABASE_URL;

interface ClientLike {
  query(sql: string): Promise<unknown>;
  end(): Promise<void>;
}

describe.skipIf(SKIP)('append-only triggers', () => {
  let client: ClientLike;

  beforeAll(async () => {
    // טעינה דינמית כדי לא לחייב pg כתלות קבועה לבדיקות יחידה
    const { Client } = (await import('pg')) as { Client: new (cfg: { connectionString: string }) => ClientLike };
    client = new Client({ connectionString: process.env.DATABASE_URL! });
    await (client as unknown as { connect: () => Promise<void> }).connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        action TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        hash TEXT NOT NULL,
        "prevHash" TEXT
      );
    `);

    const trig = readFileSync(
      join(__dirname, '..', 'src', 'db', 'triggers.sql'),
      'utf8',
    );
    await client.query(trig);
  });

  afterAll(async () => {
    await client?.query?.('DROP TABLE IF EXISTS "AuditLog" CASCADE;').catch(() => undefined);
    await client?.end?.();
  });

  it('INSERT עובד', async () => {
    await expect(
      client.query(
        `INSERT INTO "AuditLog" (id, model, action, hash) VALUES ('t1','User','create','h1')`,
      ),
    ).resolves.toBeDefined();
  });

  it('UPDATE נכשל', async () => {
    await expect(
      client.query(`UPDATE "AuditLog" SET action='X' WHERE id='t1'`),
    ).rejects.toThrow(/append-only/);
  });

  it('DELETE נכשל', async () => {
    await expect(
      client.query(`DELETE FROM "AuditLog" WHERE id='t1'`),
    ).rejects.toThrow(/append-only/);
  });

  it('TRUNCATE נכשל', async () => {
    await expect(client.query(`TRUNCATE "AuditLog"`)).rejects.toThrow(/append-only/);
  });
});
