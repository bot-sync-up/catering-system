/**
 * Dashboard API — KPI cards
 *
 * GET /api/bi/dashboard?period=month|quarter|year
 *
 * מחזיר:
 *  - revenue:     הכנסה לתקופה הנוכחית + השוואה לתקופה הקודמת (% שינוי)
 *  - grossMargin: רווח גולמי + %
 *  - ebitda:      EBITDA + %
 *  - cash:        מזומן זמין (Σ inflow - Σ outflow YTD)
 *  - openInvoices:סך חשבוניות פתוחות (outstanding)
 *  - upcomingEvents: מספר אירועים ב-30 הימים הקרובים
 *  - topCustomers: 5 לקוחות מובילים בתקופה
 *  - cashflowSeries: סדרת תזרים 12+6 חודשים
 *
 * הפונקציה יודעת לעבוד עם Express/Fastify/Next handler — מקבלת
 * tenantId + period ומחזירה JSON-friendly object.
 */
import { Decimal } from "decimal.js";
import { addMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import type { Period } from "../types.js";
import { getPrisma } from "../utils/prisma.js";
import { buildPnL, summarizePnL } from "../aggregations/pnl.js";
import { buildCashflow } from "../aggregations/cashflow.js";
import { breakdownByCustomer } from "../aggregations/breakdowns.js";
import { buildAgingReport } from "../aggregations/aging.js";
import { pct, sumDecimals, toDecimal } from "../utils/decimal.js";

export interface DashboardRequest {
  tenantId: string;
  period: Period;
}

export interface DashboardKpi {
  current: number;
  previous: number;
  /** % שינוי */
  delta: number;
}

export interface DashboardResponse {
  period: Period;
  range: { from: string; to: string };
  revenue: DashboardKpi;
  grossMargin: DashboardKpi & { marginPct: number };
  ebitda: DashboardKpi & { marginPct: number };
  cash: { ytdNet: number };
  openInvoicesTotal: number;
  upcomingEvents: number;
  topCustomers: { customerId: string; label: string; revenue: number; sharePct: number }[];
  cashflowSeries: { label: string; net: number; kind: "actual" | "forecast"; confidence?: number }[];
}

export async function getDashboard(req: DashboardRequest): Promise<DashboardResponse> {
  const prisma = getPrisma();
  const { tenantId, period } = req;
  const now = new Date();

  const currentRange = rangeFor(period, now);
  const previousRange = rangeFor(period, addPeriod(now, period, -1));

  // P&L נוכחי וקודם
  const [currBuckets, prevBuckets] = await Promise.all([
    buildPnL({ tenantId, period, range: currentRange }),
    buildPnL({ tenantId, period, range: previousRange }),
  ]);
  const curr = summarizePnL(currBuckets);
  const prev = summarizePnL(prevBuckets);

  // Cashflow YTD net
  const ytdRange = { from: startOfYear(now), to: now };
  const cfPoints = await buildCashflow({
    tenantId,
    historicalRange: ytdRange,
    forecastMonths: 6,
  });
  const ytdActual = cfPoints.filter((p) => p.kind === "actual");
  const ytdNet = sumDecimals(ytdActual.map((p) => p.net)).toNumber();

  // Open invoices
  const aging = await buildAgingReport({ tenantId });
  const openInvoicesTotal = sumDecimals(aging.buckets.map((b) => b.total)).toNumber();

  // Upcoming events
  const upcomingEvents = await prisma.event.count({
    where: {
      tenantId,
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      startsAt: { gte: now, lte: addMonths(now, 1) },
    },
  });

  // Top customers
  const topCustomers = (
    await breakdownByCustomer({ tenantId, range: currentRange })
  )
    .slice(0, 5)
    .map((r) => ({
      customerId: r.key,
      label: r.label,
      revenue: toDecimal(r.revenue).toNumber(),
      sharePct: r.sharePct,
    }));

  return {
    period,
    range: { from: currentRange.from.toISOString(), to: currentRange.to.toISOString() },
    revenue: kpi(curr.revenue, prev.revenue),
    grossMargin: {
      ...kpi(curr.grossMargin, prev.grossMargin),
      marginPct: curr.grossMarginPct,
    },
    ebitda: {
      ...kpi(curr.ebitda, prev.ebitda),
      marginPct: curr.ebitdaMarginPct,
    },
    cash: { ytdNet },
    openInvoicesTotal,
    upcomingEvents,
    topCustomers,
    cashflowSeries: cfPoints.map((p) => ({
      label: p.label,
      net: toDecimal(p.net).toNumber(),
      kind: p.kind,
      ...(p.confidence !== undefined ? { confidence: p.confidence } : {}),
    })),
  };
}

function kpi(currD: Decimal, prevD: Decimal): DashboardKpi {
  const current = currD.toNumber();
  const previous = prevD.toNumber();
  return { current, previous, delta: pct(currD.minus(prevD), prevD) };
}

function rangeFor(period: Period, ref: Date): { from: Date; to: Date } {
  switch (period) {
    case "month":
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
    case "quarter":
      return { from: startOfQuarter(ref), to: endOfQuarter(ref) };
    case "year":
      return { from: startOfYear(ref), to: endOfYear(ref) };
  }
}

function addPeriod(d: Date, period: Period, n: number): Date {
  switch (period) {
    case "month":
      return addMonths(d, n);
    case "quarter":
      return addMonths(d, n * 3);
    case "year":
      return addMonths(d, n * 12);
  }
}
