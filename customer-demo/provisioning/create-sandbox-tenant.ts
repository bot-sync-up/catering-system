/**
 * create-sandbox-tenant.ts
 *
 * Creates an isolated demo tenant with seed data and auto-deletion after 30 days.
 *
 * Usage:
 *   pnpm tsx ./customer-demo/provisioning/create-sandbox-tenant.ts \
 *     --name "Demo - שם הלקוח" \
 *     --domain "demo-acme.syncup.co.il" \
 *     --plan "trial-14d" \
 *     --seed full
 *
 * Required env vars:
 *   SYNCUP_ADMIN_TOKEN  - admin API token (provisioning scope)
 *   SYNCUP_API_BASE     - defaults to https://api.syncup.co.il
 */

import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";

interface CreateTenantArgs {
  name: string;
  domain: string;
  plan: "trial-7d" | "trial-14d" | "trial-30d";
  seed: "minimal" | "standard" | "full";
}

interface TenantResponse {
  tenant_id: string;
  schema: string;
  admin_url: string;
  api_key_public: string;
  webhook_secret: string;
  delete_at: string;
}

const API_BASE = process.env.SYNCUP_API_BASE ?? "https://api.syncup.co.il";
const ADMIN_TOKEN = process.env.SYNCUP_ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("Missing SYNCUP_ADMIN_TOKEN env var");
  process.exit(1);
}

function parseInputs(): CreateTenantArgs {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      domain: { type: "string" },
      plan: { type: "string", default: "trial-14d" },
      seed: { type: "string", default: "standard" },
    },
  });

  if (!values.name || !values.domain) {
    throw new Error("--name and --domain are required");
  }

  return {
    name: values.name,
    domain: values.domain,
    plan: values.plan as CreateTenantArgs["plan"],
    seed: values.seed as CreateTenantArgs["seed"],
  };
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

async function waitForReady(tenantId: string, maxSeconds = 120): Promise<void> {
  for (let i = 0; i < maxSeconds; i++) {
    const res = await fetch(`${API_BASE}/admin/tenants/${tenantId}/status`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const data = (await res.json()) as { status: string };
    if (data.status === "ready") return;
    if (data.status === "failed") throw new Error("Tenant provisioning failed");
    await sleep(1000);
  }
  throw new Error("Timed out waiting for tenant to be ready");
}

async function main() {
  const args = parseInputs();

  console.log(`==> Creating tenant: ${args.name} (${args.domain})`);

  // Step 1: create tenant
  const tenant = await apiPost<TenantResponse>("/admin/demo/tenants", {
    name: args.name,
    domain: args.domain,
    plan: args.plan,
    auto_delete_days: 30,
    demo_mode: true,
  });

  console.log(`  tenant_id: ${tenant.tenant_id}`);
  console.log(`  schema:    ${tenant.schema}`);

  // Step 2: wait until tenant is provisioned (DB schema, services up)
  console.log("==> Waiting for tenant to be ready...");
  await waitForReady(tenant.tenant_id);

  // Step 3: seed data
  console.log(`==> Seeding data (${args.seed})...`);
  await apiPost(`/admin/demo/tenants/${tenant.tenant_id}/seed`, {
    preset: args.seed,
    locale: "he-IL",
    timezone: "Asia/Jerusalem",
  });

  // Step 4: apply demo watermark
  console.log("==> Applying DEMO MODE watermark...");
  await apiPost(`/admin/demo/tenants/${tenant.tenant_id}/watermark`, {
    enabled: true,
    text: "DEMO MODE — נמחק אוטומטית",
    position: "top-right",
  });

  // Step 5: configure rate limits
  console.log("==> Setting rate limits...");
  await apiPost(`/admin/demo/tenants/${tenant.tenant_id}/rate-limits`, {
    api_calls_per_hour: 1000,
    whatsapp_messages_per_day: 50,
    sms_per_day: 10,
    emails_per_day: 100,
  });

  console.log("\n==> Demo tenant ready!");
  console.log(`  Admin URL:      ${tenant.admin_url}`);
  console.log(`  Public API key: ${tenant.api_key_public}`);
  console.log(`  Webhook secret: ${tenant.webhook_secret}`);
  console.log(`  Auto-delete:    ${tenant.delete_at}`);
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
