/**
 * Rotation job for JWT_SECRET, JWT_REFRESH_SECRET, AES_KEY, and 3rd-party API keys.
 *
 * Strategy: write a *new* version, mark previous as `kid: previous` so existing
 * JWTs still verify until they expire. After grace window the old version is destroyed.
 *
 * Usage:
 *   tsx rotate-secrets.ts --key auth/jwt
 *   tsx rotate-secrets.ts --key payments/cardcom    # requires manual confirmation
 */
import { randomBytes } from "node:crypto";
import vault from "node-vault";

const client = vault({
  apiVersion: "v1",
  endpoint: process.env.VAULT_ADDR!,
  token: process.env.VAULT_TOKEN!,
});

const TARGETS: Record<string, () => Promise<string>> = {
  "auth/jwt":         async () => randomBytes(64).toString("hex"),
  "auth/refresh":     async () => randomBytes(64).toString("hex"),
  "auth/aes":         async () => randomBytes(32).toString("base64"),
  "auth/nextauth":    async () => randomBytes(48).toString("base64"),
  "obs/sentry":       async () => { throw new Error("manual: rotate Sentry DSN in dashboard"); },
  "payments/cardcom": async () => { throw new Error("manual: rotate Cardcom API password in portal, paste to Vault"); },
};

async function rotate(key: string) {
  const gen = TARGETS[key];
  if (!gen) throw new Error(`Unknown key ${key}`);

  const value = await gen();
  const path = `platform/data/${key}`;

  // 1. Read current to keep as `previous`
  let current: any = null;
  try {
    current = (await client.read(path)).data?.data ?? null;
  } catch {}

  // 2. Write new version
  await client.write(path, {
    data: {
      value,
      kid: `v${Date.now()}`,
      previous: current?.value ?? null,
      previousKid: current?.kid ?? null,
      rotatedAt: new Date().toISOString(),
    },
  });

  console.log(`Rotated ${key} (kid=v${Date.now()}). Previous kept for grace period.`);

  // 3. Schedule destruction of previous after 7 days (out of band)
  console.log(`Reminder: destroy previous version after 7d via 'vault kv destroy -versions=N platform/${key}'`);
}

const key = process.argv[process.argv.indexOf("--key") + 1];
if (!key) { console.error("usage: --key <path>"); process.exit(2); }
rotate(key).catch((e) => { console.error(e); process.exit(1); });
