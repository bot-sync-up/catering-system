/**
 * 30 משלוחים — מקושרים לאירועים, רכבים ונהגים.
 */
import type { DeliveryStatus } from "@prisma/client";
import { did } from "../utils/ids.js";
import { pick, chance, randInt } from "../utils/rng.js";
import { randomCity, randomStreet } from "../utils/hebrew.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";
import type { SeededEvent } from "./events.js";
import type { SeededVehicle } from "./vehicles.js";
import type { SeededEmployee } from "./employees.js";

export async function seedDeliveries(
  ctx: SeedContext,
  events: SeededEvent[],
  vehicles: SeededVehicle[],
  employees: SeededEmployee[],
): Promise<void> {
  const { prisma, tenantId, factor } = ctx;
  const drivers = employees.filter((e) => e.role === "driver");
  const count = Math.min(scaled(30, factor), events.length);

  for (let i = 0; i < count; i++) {
    const event = events[i];
    const isPast = event.bucket === "past";
    const status: DeliveryStatus = isPast
      ? "DELIVERED"
      : event.bucket === "present"
        ? (chance(0.5) ? "IN_TRANSIT" : "SCHEDULED")
        : "SCHEDULED";

    const scheduledAt = new Date(event.startsAt.getTime() - (2 + randInt(0, 3)) * 3_600_000);
    const vehicle = vehicles.length ? pick(vehicles) : null;
    const driver = drivers.length ? pick(drivers) : null;

    const id = did(`delivery:${event.id}:${i}`);
    await prisma.delivery.upsert({
      where: { id },
      update: { status },
      create: {
        id,
        tenantId,
        eventId: event.id,
        vehicleId: vehicle?.id ?? null,
        driverId: driver?.id ?? null,
        status,
        scheduledAt,
        departedAt: isPast ? new Date(scheduledAt.getTime() + 15 * 60_000) : null,
        arrivedAt: isPast ? new Date(scheduledAt.getTime() + 90 * 60_000) : null,
        destinationAddr: `${randomStreet()} ${randInt(1, 200)}, ${randomCity()}`,
        notes: status === "DELIVERED" ? "נמסר בהצלחה" : null,
        signature: status === "DELIVERED" ? "חתום על ידי המזמין" : null,
      },
    });
  }
}
