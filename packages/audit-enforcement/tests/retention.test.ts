/**
 * tests/retention.test.ts
 *
 * בדיקה אינטגרציה לפונקציית archive_old_audit_logs.
 * דורש Postgres + DATABASE_URL — אחרת מדולג.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = !process.env.DATABASE_URL;

interface ClientLike {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  end(): Promise<void>;
}

describe.skipIf(SKIP)('archive_old_audit_logs', () => {
  let client: ClientLike;

  beforeAll(async () => {
    const { Client } = (await import('pg')) as { Client: new (cfg: { connectionString: string }) => ClientLike };
    client = new Client({ connectionString: process.env.DATABASE_URL! });
    await (client as unknown as { connect: () => Promise<void> }).connect();

    // סכמה מינימלית ל-AuditLog (תואם את הפונקציה ב-retention.sql)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        action TEXT NOT NULL,
        "recordId" TEXT,
        "oldValues" JSONB,
        "newValues" JSONB,
        "userId" TEXT,
        ip TEXT,
        "userAgent" TEXT,
        "requestId" TEXT,
        "tenantId" TEXT,
        role TEXT,
        channel TEXT NOT NULL DEFAULT 'system',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        hash TEXT NOT NULL,
        "prevHash" TEXT
      );
    `);
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    const triggers = readFileSync(join(__dirname, '..', 'src', 'db', 'triggers.sql'), 'utf8');
    await client.query(triggers);

    const retention = readFileSync(join(__dirname, '..', 'src', 'db', 'retention.sql'), 'utf8');
    await client.query(retention);
  });

  afterAll(async () => {
    await client?.query?.('DROP TABLE IF EXISTS "AuditLogArchive" CASCADE').catch(() => undefined);
    await client?.query?.('DROP TABLE IF EXISTS "AuditLog" CASCADE').catch(() => undefined);
    await client?.end?.();
  });

  it('מעביר רשומות ישנות מ-7 שנים לארכיון', async () => {
    // רשומה ישנה (8 שנים)
    await client.query(
      `INSERT INTO "AuditLog" (id, model, action, hash, "createdAt")
       VALUES ('old-1','User','create','hash-old', NOW() - INTERVAL '8 years')`,
    );
    // רשומה חדשה (אתמול)
    await client.query(
      `INSERT INTO "AuditLog" (id, model, action, hash, "createdAt")
       VALUES ('new-1','User','create','hash-new', NOW() - INTERVAL '1 day')`,
    );

    const { rows } = await client.query<{ archived: string }>(
      `SELECT archived::text FROM archive_old_audit_logs(2557)`,
    );
    expect(Number(rows[0].archived)).toBeGreaterThanOrEqual(1);

    const inLive = await client.query<{ id: string }>(
      `SELECT id FROM "AuditLog" WHERE id = 'old-1'`,
    );
    expect(inLive.rows.length).toBe(0);

    const inArchive = await client.query<{ id: string }>(
      `SELECT id FROM "AuditLogArchive" WHERE id = 'old-1'`,
    );
    expect(inArchive.rows.length).toBe(1);

    // החדשה נשארת
    const newStill = await client.query<{ id: string }>(
      `SELECT id FROM "AuditLog" WHERE id = 'new-1'`,
    );
    expect(newStill.rows.length).toBe(1);
  });
});
