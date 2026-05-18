/**
 * Cashflow — actual + forecast 6 חודשים קדימה
 *
 * Actual:
 *   Inflow:  Payment(status=PAID, OFFICIAL) — לפי paidAt
 *   Outflow: Expense(OFFICIAL) + PayrollRecord(OFFICIAL) + SupplierInvoice(שולמו)
 *
 * Forecast:
 *   1. רגרסיה לינארית על inflow/outflow היסטוריים (12 חודשים אחורה לפחות).
 *   2. תיקון עונתי על-בסיס היסטוריה של אותו חודש בעבר.
 *   3. הוספת הכנסות צפויות מ-Contracts (events במצב CONFIRMED שלא נפרעו במלואם).
 *   4. הוספת recurring expenses (BudgetCategory.monthlyBudget).
 *
 * רמת ביטחון: R² של הרגרסיה * decay(distance_months).
 */
import { Decimal } from "decimal.js";
import { addMonths, startOfMonth } from "date-fns";
import type { CashflowPoint, TenantScope, DateRange } from "../types.js";
import { getPrisma } from "../utils/prisma.js";
import { bucketLabel, bucketStart, generateBuckets } from "../utils/dates.js";
import { toDecimal } from "../utils/decimal.js";
import { linearRegression } from "../forecast/linear-regression.js";
import { applySeasonalFactor, computeSeasonalIndex } from "../forecast/seasonal.js";

export interface CashflowOptions extends TenantScope {
  /** טווח היסטורי לניתוח (מומלץ 12+ חודשים אחורה) */
  historicalRange: DateRange;
  /** מספר חודשים קדימה לחיזוי — ברירת מחדל 6 */
  forecastMonths?: number;
}

export async function buildCashflow(opts: CashflowOptions): Promise<CashflowPoint[]> {
  const prisma = getPrisma();
  const { tenantId, historicalRange } = opts;
  const forecastMonths = opts.forecastMonths ?? 6;

  // === 1. Actual ===
  const [payments, expenses, payroll] = await Promise.all([
    prisma.payment.findMany({
      where: {
        tenantId,
        status: "PAID",
        category: "OFFICIAL",
        paidAt: { gte: historicalRange.from, lte: historicalRange.to },
      },
      select: { paidAt: true, amount: true },
    }),
    prisma.expense.findMany({
      where: {
        tenantId,
        category: "OFFICIAL",
        occurredAt: { gte: historicalRange.from, lte: historicalRange.to },
      },
      select: { occurredAt: true, amount: true },
    }),
    prisma.payrollRecord.findMany({
      where: {
        tenantId,
        category: "OFFICIAL",
        paidAt: { gte: historicalRange.from, lte: historicalRange.to, not: null },
      },
      select: { paidAt: true, netPay: true },
    }),
  ]);

  const inflowByBucket = new Map<number, Decimal>();
  const outflowByBucket = new Map<number, Decimal>();
  const addAmount = (m: Map<number, Decimal>, when: Date | null, amount: Decimal) => {
    if (!when) return;
    const bs = bucketStart(when, "month").getTime();
    m.set(bs, (m.get(bs) ?? new Decimal(0)).plus(amount));
  };
  for (const p of payments) addAmount(inflowByBucket, p.paidAt, toDecimal(p.amount));
  for (const e of expenses) addAmount(outflowByBucket, e.occurredAt, toDecimal(e.amount));
  for (const pr of payroll) addAmount(outflowByBucket, pr.paidAt, toDecimal(pr.netPay));

  const buckets = generateBuckets(historicalRange, "month");
  const actualPoints: CashflowPoint[] = buckets.map((bs) => {
    const inflow = inflowByBucket.get(bs.getTime()) ?? new Decimal(0);
    const outflow = outflowByBucket.get(bs.getTime()) ?? new Decimal(0);
    return {
      periodStart: bs,
      label: bucketLabel(bs, "month"),
      inflow,
      outflow,
      net: inflow.minus(outflow),
      kind: "actual",
    };
  });

  // === 2. Forecast — regression + seasonal ===
  const xy = (key: "inflow" | "outflow") =>
    actualPoints.map((p, i) => ({ x: i, y: p[key].toNumber() }));
  const inReg = linearRegression(xy("inflow"));
  const outReg = linearRegression(xy("outflow"));

  const inSeasonal = computeSeasonalIndex(
    actualPoints.map((p) => ({ date: p.periodStart, value: p.inflow.toNumber() })),
  );
  const outSeasonal = computeSeasonalIndex(
    actualPoints.map((p) => ({ date: p.periodStart, value: p.outflow.toNumber() })),
  );

  // === 3. Pipeline — חוזים פתוחים: events CONFIRMED עם יתרת חוב ===
  const pipelineFrom = startOfMonth(addMonths(historicalRange.to, 1));
  const pipelineTo = addMonths(pipelineFrom, forecastMonths);
  const upcomingEvents = await prisma.event.findMany({
    where: {
      tenantId,
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      startsAt: { gte: pipelineFrom, lt: pipelineTo },
    },
    select: { startsAt: true, totalPrice: true, paidAmount: true },
  });
  const pipelineByBucket = new Map<number, Decimal>();
  for (const ev of upcomingEvents) {
    const remaining = toDecimal(ev.totalPrice).minus(toDecimal(ev.paidAmount));
    if (remaining.lte(0)) continue;
    const bs = bucketStart(ev.startsAt, "month").getTime();
    pipelineByBucket.set(bs, (pipelineByBucket.get(bs) ?? new Decimal(0)).plus(remaining));
  }

  // === 4. Recurring expenses — BudgetCategory.monthlyBudget ===
  const budgets = await prisma.budgetCategory.findMany({
    where: { tenantId, isActive: true, monthlyBudget: { not: null } },
    select: { monthlyBudget: true },
  });
  const recurringMonthly = budgets.reduce<Decimal>(
    (acc, b) => acc.plus(toDecimal(b.monthlyBudget)),
    new Decimal(0),
  );

  // === Build forecast points ===
  const forecastPoints: CashflowPoint[] = [];
  for (let i = 1; i <= forecastMonths; i++) {
    const bs = startOfMonth(addMonths(historicalRange.to, i));
    const idx = actualPoints.length + i - 1;
    const inflowTrend = Math.max(0, inReg.predict(idx));
    const outflowTrend = Math.max(0, outReg.predict(idx));
    const inflowSeasonal = applySeasonalFactor(inSeasonal, bs, inflowTrend);
    const outflowSeasonal = applySeasonalFactor(outSeasonal, bs, outflowTrend);
    const pipeline = pipelineByBucket.get(bs.getTime()) ?? new Decimal(0);

    const inflow = new Decimal(inflowSeasonal).plus(pipeline);
    const outflow = new Decimal(outflowSeasonal).plus(recurringMonthly);

    // ביטחון יורד עם המרחק
    const decay = Math.pow(0.9, i - 1);
    const baseConf = Math.max(inReg.r2, outReg.r2) * decay;
    const confidence = pipeline.gt(0) ? Math.min(1, baseConf + 0.15) : baseConf;

    forecastPoints.push({
      periodStart: bs,
      label: bucketLabel(bs, "month"),
      inflow,
      outflow,
      net: inflow.minus(outflow),
      kind: "forecast",
      confidence: Math.max(0, Math.min(1, confidence)),
    });
  }

  return [...actualPoints, ...forecastPoints];
}
