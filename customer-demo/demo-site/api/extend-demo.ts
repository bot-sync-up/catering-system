/**
 * POST /api/extend-demo
 *
 * Allows a trial user to request a 7-day extension. Routes to:
 * - Auto-approval if first extension and engagement metrics are good
 * - Human review (CSM) otherwise
 *
 * Engagement criteria for auto-approval:
 * - At least 3 logins in the last 7 days
 * - At least 1 sales feature used (lead, quote, invoice)
 * - No abuse signals
 */

import type { NextApiRequest, NextApiResponse } from "next";

interface ExtendDemoBody {
  tenant_id: string;
  requester_email: string;
  reason?: string;
}

interface EngagementMetrics {
  logins_last_7d: number;
  features_used: string[];
  api_calls_total: number;
  has_abuse_signal: boolean;
  extension_count: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body as ExtendDemoBody;

  if (!body.tenant_id || !body.requester_email) {
    return res.status(400).json({ error: "missing required fields" });
  }

  // Verify the requester is the demo owner (by email match)
  const tenant = await getTenant(body.tenant_id);
  if (!tenant || tenant.contact_email !== body.requester_email.toLowerCase()) {
    return res.status(403).json({ error: "unauthorized" });
  }

  const engagement = await getEngagement(body.tenant_id);

  if (shouldAutoApprove(engagement)) {
    await extendTenant(body.tenant_id, 7);
    await sendExtensionConfirmation(body.requester_email, {
      new_expiry: addDays(tenant.delete_at, 7),
    });
    await notifyCsmSlack({
      type: "auto_approved",
      tenant_id: body.tenant_id,
      engagement,
    });
    return res.status(200).json({
      approved: true,
      new_expiry: addDays(tenant.delete_at, 7),
      message: "סביבת הדמו הוארכה ב-7 ימים נוספים.",
    });
  }

  // Route to CSM for manual review
  await createCsmTask({
    tenant_id: body.tenant_id,
    requester: body.requester_email,
    reason: body.reason ?? "",
    engagement,
  });

  return res.status(202).json({
    approved: false,
    pending: true,
    message: "הבקשה התקבלה. CSM יחזור אליך תוך 4 שעות.",
  });
}

function shouldAutoApprove(e: EngagementMetrics): boolean {
  return (
    e.extension_count === 0 &&
    e.logins_last_7d >= 3 &&
    e.features_used.length >= 1 &&
    e.api_calls_total >= 20 &&
    !e.has_abuse_signal
  );
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// === Stubs (implementations in services/) ===

async function getTenant(
  tenantId: string
): Promise<{ contact_email: string; delete_at: string } | null> {
  const res = await fetch(`${process.env.SYNCUP_API_BASE}/admin/demo/tenants/${tenantId}`, {
    headers: { Authorization: `Bearer ${process.env.SYNCUP_ADMIN_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function getEngagement(tenantId: string): Promise<EngagementMetrics> {
  const res = await fetch(
    `${process.env.SYNCUP_API_BASE}/admin/demo/tenants/${tenantId}/engagement`,
    { headers: { Authorization: `Bearer ${process.env.SYNCUP_ADMIN_TOKEN}` } }
  );
  return res.json();
}

async function extendTenant(tenantId: string, days: number) {
  await fetch(
    `${process.env.SYNCUP_API_BASE}/admin/demo/tenants/${tenantId}/extend`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SYNCUP_ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ days }),
    }
  );
}

async function sendExtensionConfirmation(email: string, vars: Record<string, unknown>) {
  // SendGrid template
}

async function notifyCsmSlack(payload: Record<string, unknown>) {
  await fetch(process.env.SLACK_WEBHOOK_CSM!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: JSON.stringify(payload) }),
  });
}

async function createCsmTask(payload: Record<string, unknown>) {
  // Creates a task in internal CSM dashboard
}
