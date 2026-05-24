/**
 * תלושי שכר — 3 חודשים אחרונים לכל עובד.
 * חישוב ישראלי: ביטוח לאומי + מס הכנסה (פשטני).
 */
import { did } from "../utils/ids.js";
import { round2 } from "../utils/money.js";
import { startOfMonth, endOfMonth, daysAgo } from "../utils/dates.js";
import { randInt, chance } from "../utils/rng.js";
import type { SeedContext } from "../context.js";
import type { SeededEmployee } from "./employees.js";

const MONTHS_BACK = 3;

function israeliTax(gross: number): { tax: number; socialSec: number } {
  // ביטוח לאומי 7% (פשטני)
  const socialSec = round2(gross * 0.07);
  // מס הכנסה מדורג פשוט
  let tax = 0;
  if (gross > 18000) tax = round2(gross * 0.35);
  else if (gross > 12000) tax = round2(gross * 0.2);
  else if (gross > 7000) tax = round2(gross * 0.1);
  else tax = round2(gross * 0.03);
  return { tax, socialSec };
}

export async function seedPayroll(
  ctx: SeedContext,
  employees: SeededEmployee[],
): Promise<void> {
  const { prisma, tenantId } = ctx;

  for (const emp of employees) {
    for (let m = 1; m <= MONTHS_BACK; m++) {
      const refDate = daysAgo(m * 30);
      const start = startOfMonth(refDate);
      const end = endOfMonth(refDate);

      const baseHours = emp.hourlyRate > 0 ? randInt(140, 200) : 186;
      const hoursWorked = baseHours as number;
      const baseSalary = emp.monthlySalary;
      const overtime = chance(0.4) ? round2(randInt(500, 2500)) : 0;
      const bonuses = chance(0.2) ? round2(randInt(300, 2000)) : 0;
      const gross = round2(baseSalary + overtime + bonuses);
      const { tax, socialSec } = israeliTax(gross);
      const deductions = chance(0.2) ? round2(randInt(50, 300)) : 0;
      const netPay = round2(gross - tax - socialSec - deductions);

      const id = did(`payroll:${emp.id}:${start.toISOString().slice(0, 7)}`);
      await prisma.payrollRecord.upsert({
        where: {
          employeeId_periodStart_periodEnd: {
            employeeId: emp.id,
            periodStart: start,
            periodEnd: end,
          },
        },
        update: {},
        create: {
          id,
          tenantId,
          employeeId: emp.id,
          periodStart: start,
          periodEnd: end,
          hoursWorked: hoursWorked as any,
          baseSalary: baseSalary as any,
          overtime: overtime as any,
          bonuses: bonuses as any,
          deductions: deductions as any,
          taxWithheld: tax as any,
          socialSecurity: socialSec as any,
          netPay: netPay as any,
          category: "OFFICIAL",
          paidAt: end,
        },
      });
    }
  }
}
