/**
 * Breakdowns — פילוח הכנסות לפי סוכן/לקוח/קטגוריה
 *
 * sourceOfRevenue = Payment(status=PAID, OFFICIAL).
 *  - byCustomer: GROUP BY customer_id
 *  - byAgent:    GROUP BY event.metadata.agent_id (אם קיים) או StaffAssignment 'AGENT'
 *  - byCategory: GROUP BY EventType
 */
import { Decimal } from "decimal.js";
import type { BreakdownRow, TenantScope, DateRange } from "../types.js";
import { getPrisma } from "../utils/prisma.js";
import { pct, sumDecimals, toDecimal } from "../utils/decimal.js";

export interface BreakdownOptions extends TenantScope {
  range: DateRange;
}

export async function breakdownByCustomer(opts: BreakdownOptions): Promise<BreakdownRow[]> {
  const prisma = getPrisma();
  const { tenantId, range } = opts;

  const grouped = await prisma.payment.groupBy({
    by: ["customerId"],
    where: {
      tenantId,
      status: "PAID",
      category: "OFFICIAL",
      paidAt: { gte: range.from, lte: range.to },
    },
    _sum: { amount: true },
    _count: true,
  });

  const customers = await prisma.customer.findMany({
    where: { tenantId, id: { in: grouped.map((g) => g.customerId) } },
    select: { id: true, name: true, hebrewName: true },
  });
  const nameById = new Map(customers.map((c) => [c.id, c.hebrewName ?? c.name]));

  const totals = grouped.map((g) => ({
    key: g.customerId,
    label: nameById.get(g.customerId) ?? "—",
    revenue: toDecimal(g._sum.amount),
    count: g._count,
  }));
  return withShare(totals);
}

export async function breakdownByEventType(opts: BreakdownOptions): Promise<BreakdownRow[]> {
  const prisma = getPrisma();
  const { tenantId, range } = opts;

  // נאסוף לפי event.type — לכן מתחילים מ-events ומסכמים payments שלהם
  const events = await prisma.event.findMany({
    where: {
      tenantId,
      startsAt: { gte: range.from, lte: range.to },
    },
    select: {
      id: true,
      type: true,
      payments: {
        where: { status: "PAID", category: "OFFICIAL" },
        select: { amount: true },
      },
    },
  });

  const byType = new Map<string, { revenue: Decimal; count: number }>();
  for (const ev of events) {
    const total = sumDecimals(ev.payments.map((p) => p.amount));
    if (total.isZero()) continue;
    const cur = byType.get(ev.type) ?? { revenue: new Decimal(0), count: 0 };
    cur.revenue = cur.revenue.plus(total);
    cur.count += 1;
    byType.set(ev.type, cur);
  }
  const rows = [...byType.entries()].map(([key, v]) => ({
    key,
    label: hebrewEventType(key),
    revenue: v.revenue,
    count: v.count,
  }));
  return withShare(rows);
}

export async function breakdownByAgent(opts: BreakdownOptions): Promise<BreakdownRow[]> {
  const prisma = getPrisma();
  const { tenantId, range } = opts;

  // event.metadata.agentId — לא ניתן לסנן/groupBy ב-Prisma על JSON ישירות
  // לכן מושכים את כל הevents עם תשלומיהם.
  const events = await prisma.event.findMany({
    where: {
      tenantId,
      startsAt: { gte: range.from, lte: range.to },
    },
    select: {
      id: true,
      metadata: true,
      staffAssignments: {
        where: { role: { equals: "AGENT", mode: "insensitive" } },
        select: {
          user: { select: { id: true, firstName: true, lastName: true } },
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      payments: {
        where: { status: "PAID", category: "OFFICIAL" },
        select: { amount: true },
      },
    },
  });

  const byAgent = new Map<string, { label: string; revenue: Decimal; count: number }>();
  for (const ev of events) {
    const revenue = sumDecimals(ev.payments.map((p) => p.amount));
    if (revenue.isZero()) continue;

    // 1. metadata.agentId
    let agentId: string | null = null;
    let agentLabel = "—";
    const meta = ev.metadata as Record<string, unknown> | null;
    if (meta && typeof meta.agentId === "string") {
      agentId = meta.agentId;
      if (typeof meta.agentName === "string") agentLabel = meta.agentName;
    }
    // 2. fallback: StaffAssignment role=AGENT
    if (!agentId && ev.staffAssignments.length > 0) {
      const a = ev.staffAssignments[0]!;
      if (a.user) {
        agentId = a.user.id;
        agentLabel = `${a.user.firstName} ${a.user.lastName}`;
      } else if (a.employee) {
        agentId = a.employee.id;
        agentLabel = `${a.employee.firstName} ${a.employee.lastName}`;
      }
    }
    if (!agentId) {
      agentId = "_unassigned";
      agentLabel = "ללא סוכן";
    }
    const cur = byAgent.get(agentId) ?? { label: agentLabel, revenue: new Decimal(0), count: 0 };
    cur.revenue = cur.revenue.plus(revenue);
    cur.count += 1;
    byAgent.set(agentId, cur);
  }
  const rows = [...byAgent.entries()].map(([key, v]) => ({
    key,
    label: v.label,
    revenue: v.revenue,
    count: v.count,
  }));
  return withShare(rows);
}

function withShare(rows: Array<{ key: string; label: string; revenue: Decimal; count: number }>): BreakdownRow[] {
  const total = sumDecimals(rows.map((r) => r.revenue));
  return rows
    .map((r) => ({
      ...r,
      sharePct: pct(r.revenue, total),
    }))
    .sort((a, b) => b.revenue.cmp(a.revenue));
}

function hebrewEventType(t: string): string {
  const map: Record<string, string> = {
    WEDDING: "חתונה",
    BAR_MITZVAH: "בר מצווה",
    BAT_MITZVAH: "בת מצווה",
    BRIT_MILAH: "ברית מילה",
    ENGAGEMENT: "אירוסין",
    SHEVA_BRACHOT: "שבע ברכות",
    CORPORATE: "אירוע עסקי",
    CONFERENCE: "כנס",
    PRIVATE_PARTY: "מסיבה פרטית",
    OTHER: "אחר",
  };
  return map[t] ?? t;
}
