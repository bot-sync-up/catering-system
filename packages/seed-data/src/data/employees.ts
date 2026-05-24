/**
 * Employees — מקושר ל-Users (יחס 1:1).
 */
import { did } from "../utils/ids.js";
import { randomNationalId, randomBankAccount, randomMobile } from "../utils/hebrew.js";
import { randInt } from "../utils/rng.js";
import { daysAgo } from "../utils/dates.js";
import type { SeedContext } from "../context.js";
import type { SeededUser } from "../setup/users.js";

export interface SeededEmployee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  position: string;
  role: string;
  hourlyRate: number;
  monthlySalary: number;
}

const SALARY_BY_ROLE: Record<string, { hourly: number; monthly: number }> = {
  owner: { hourly: 0, monthly: 35000 },
  manager: { hourly: 0, monthly: 22000 },
  chef: { hourly: 75, monthly: 18000 },
  sales: { hourly: 60, monthly: 14000 },
  driver: { hourly: 50, monthly: 11000 },
  waiter: { hourly: 45, monthly: 8500 },
  accountant: { hourly: 0, monthly: 20000 },
};

export async function seedEmployees(
  ctx: SeedContext,
  users: SeededUser[],
): Promise<SeededEmployee[]> {
  const { prisma, tenantId } = ctx;
  const out: SeededEmployee[] = [];
  let empNum = 1001;

  for (const u of users) {
    const id = did(`emp:${tenantId}:${u.key}`);
    const salary = SALARY_BY_ROLE[u.role] ?? { hourly: 50, monthly: 10000 };

    await prisma.employee.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId,
        userId: u.id,
        employeeNum: String(empNum++),
        firstName: u.firstName,
        lastName: u.lastName,
        nationalId: randomNationalId(),
        email: u.email,
        phone: randomMobile(),
        position: u.position,
        department: u.department ?? "כללי",
        status: "ACTIVE",
        hireDate: daysAgo(randInt(180, 1800)),
        hourlyRate: (salary.hourly || null) as any,
        monthlySalary: salary.monthly as any,
        bankAccount: randomBankAccount(),
        metadata: { role: u.role } as any,
      },
    });

    // VacationBalance
    const vbId = did(`vb:${id}`);
    await prisma.vacationBalance.upsert({
      where: { employeeId: id },
      update: {},
      create: {
        id: vbId,
        tenantId,
        employeeId: id,
        totalDays: 22 as any,
        usedDays: randInt(0, 10) as any,
        remainingDays: randInt(8, 22) as any,
        sickDaysTotal: 18 as any,
        sickDaysUsed: randInt(0, 6) as any,
        year: 2026,
      },
    });

    out.push({
      id,
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      position: u.position,
      role: u.role,
      hourlyRate: salary.hourly,
      monthlySalary: salary.monthly,
    });
  }

  return out;
}
