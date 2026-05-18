/**
 * Retention Cohort Analysis
 *
 * Cohort = חודש האירוע הראשון של לקוח.
 * Retention[m] = אחוז הלקוחות מהקוהורט שהיו להם אירועים בחודש cohort+m.
 *
 * הגדרת "אירוע פעיל" — Event.status COMPLETED או IN_PROGRESS עם תאריך התחלה.
 */
import { startOfMonth, format } from "date-fns";
import type { RetentionCohort, TenantScope, DateRange } from "../types.js";
import { getPrisma } from "../utils/prisma.js";

export interface RetentionOptions extends TenantScope {
  range: DateRange;
  /** מספר חודשים אחורה לעקוב — ברירת מחדל 12 */
  trackMonths?: number;
}

export async function buildRetentionCohorts(opts: RetentionOptions): Promise<RetentionCohort[]> {
  const prisma = getPrisma();
  const { tenantId, range } = opts;
  const trackMonths = opts.trackMonths ?? 12;

  const events = await prisma.event.findMany({
    where: {
      tenantId,
      status: { in: ["COMPLETED", "IN_PROGRESS", "CONFIRMED"] },
      startsAt: { gte: range.from, lte: range.to },
    },
    select: { customerId: true, startsAt: true },
    orderBy: { startsAt: "asc" },
  });

  if (events.length === 0) return [];

  // לכל לקוח: תאריך אירוע ראשון
  const firstEventByCustomer = new Map<string, Date>();
  const monthsByCustomer = new Map<string, Set<string>>();
  const monthKey = (d: Date) => format(startOfMonth(d), "yyyy-MM");

  for (const ev of events) {
    const cur = firstEventByCustomer.get(ev.customerId);
    if (!cur || ev.startsAt < cur) firstEventByCustomer.set(ev.customerId, ev.startsAt);
    const set = monthsByCustomer.get(ev.customerId) ?? new Set<string>();
    set.add(monthKey(ev.startsAt));
    monthsByCustomer.set(ev.customerId, set);
  }

  // קבץ לפי cohort
  const cohorts = new Map<string, string[]>();
  for (const [customerId, firstAt] of firstEventByCustomer) {
    const c = monthKey(firstAt);
    const arr = cohorts.get(c) ?? [];
    arr.push(customerId);
    cohorts.set(c, arr);
  }

  const result: RetentionCohort[] = [];
  for (const [cohortKey, customerIds] of cohorts) {
    const [yStr, mStr] = cohortKey.split("-");
    const cohortDate = startOfMonth(new Date(Number(yStr), Number(mStr) - 1, 1));
    const retention: Record<number, number> = { 0: 100 };

    for (let m = 1; m <= trackMonths; m++) {
      const target = startOfMonth(new Date(cohortDate.getFullYear(), cohortDate.getMonth() + m, 1));
      const targetKey = monthKey(target);
      const active = customerIds.filter((cid) => monthsByCustomer.get(cid)?.has(targetKey)).length;
      retention[m] = (active / customerIds.length) * 100;
    }

    result.push({
      cohort: cohortKey,
      customers: customerIds.length,
      retention,
    });
  }
  return result.sort((a, b) => a.cohort.localeCompare(b.cohort));
}
