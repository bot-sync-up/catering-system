/**
 * 200 משמרות + time entries מקושרים.
 */
import type { ShiftStatus } from "@prisma/client";
import { did } from "../utils/ids.js";
import { randInt, pick, chance } from "../utils/rng.js";
import { daysAgo, atTime, addHours } from "../utils/dates.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";
import type { SeededEmployee } from "./employees.js";

const ROLES_BY_POSITION: Record<string, string[]> = {
  chef: ["מטבח חם", "מטבח קר", "פלאנצ'ה", "סלטים"],
  driver: ["משלוחים", "הובלת ציוד"],
  waiter: ["שטח אירוע", "תחנות הגשה", "בר"],
  sales: ["משרד", "פגישות לקוחות"],
  manager: ["פיקוח שטח", "ניהול אירוע"],
};

export async function seedShifts(
  ctx: SeedContext,
  employees: SeededEmployee[],
): Promise<void> {
  const { prisma, tenantId, factor } = ctx;
  const totalShifts = scaled(200, factor);

  for (let i = 0; i < totalShifts; i++) {
    const employee = pick(employees);
    const daysOffset = randInt(-60, 14);
    const date = daysAgo(-daysOffset);
    const startsAt = atTime(date, 8 + randInt(0, 12), 0);
    const endsAt = addHours(startsAt, 4 + randInt(0, 6));
    const isPast = daysOffset < 0;
    const status: ShiftStatus = isPast
      ? (chance(0.9) ? "COMPLETED" : chance(0.5) ? "MISSED" : "CANCELLED")
      : (chance(0.7) ? "SCHEDULED" : "CONFIRMED");

    const roles = ROLES_BY_POSITION[employee.role] ?? ["כללי"];
    const id = did(`shift:${tenantId}:${i}`);

    await prisma.shift.upsert({
      where: { id },
      update: { status },
      create: {
        id,
        tenantId,
        employeeId: employee.id,
        startsAt,
        endsAt,
        status,
        role: pick(roles),
        location: pick(["אולם השמש", "אולמי גליל", "בית הקייטרינג", "אצל הלקוח"]),
      },
    });

    // לכל משמרת שהושלמה — TimeEntry
    if (status === "COMPLETED") {
      const teId = did(`te:${id}`);
      const clockIn = new Date(startsAt.getTime() + randInt(-5, 10) * 60_000);
      const clockOut = new Date(endsAt.getTime() + randInt(-15, 30) * 60_000);
      const breakMins = randInt(15, 45);
      const totalMins = Math.max(0, Math.floor((clockOut.getTime() - clockIn.getTime()) / 60_000) - breakMins);

      await prisma.timeEntry.upsert({
        where: { id: teId },
        update: {},
        create: {
          id: teId,
          tenantId,
          employeeId: employee.id,
          shiftId: id,
          clockIn,
          clockOut,
          breakMins,
          totalMins,
          approved: chance(0.9),
        },
      });
    }
  }
}
