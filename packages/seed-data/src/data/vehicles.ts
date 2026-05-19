/**
 * 4 רכבים עם תוקפי ביטוח/רישוי וטיפולים.
 */
import { did } from "../utils/ids.js";
import { daysFromNow, daysAgo } from "../utils/dates.js";
import { randInt, pick } from "../utils/rng.js";
import type { SeedContext } from "../context.js";

interface VehicleSpec {
  key: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  color: string;
}

export const VEHICLES: VehicleSpec[] = [
  { key: "van-1", plate: "55-123-78", make: "Mercedes", model: "Sprinter", year: 2022, capacity: 1500, color: "לבן" },
  { key: "van-2", plate: "62-456-83", make: "Volkswagen", model: "Crafter", year: 2021, capacity: 1200, color: "לבן" },
  { key: "truck-1", plate: "71-987-32", make: "Iveco", model: "Daily", year: 2023, capacity: 2500, color: "כסוף" },
  { key: "small-1", plate: "98-321-65", make: "Renault", model: "Kangoo", year: 2020, capacity: 500, color: "אדום" },
];

export interface SeededVehicle extends VehicleSpec {
  id: string;
}

export async function seedVehicles(ctx: SeedContext): Promise<SeededVehicle[]> {
  const { prisma, tenantId } = ctx;
  const out: SeededVehicle[] = [];

  for (const v of VEHICLES) {
    const id = did(`vehicle:${tenantId}:${v.key}`);
    await prisma.vehicle.upsert({
      where: { id },
      update: { status: "AVAILABLE" },
      create: {
        id,
        tenantId,
        plateNumber: v.plate,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        capacity: v.capacity as any,
        status: "AVAILABLE",
        insuranceExpiry: daysFromNow(randInt(30, 365)),
        licenseExpiry: daysFromNow(randInt(60, 730)),
        lastServiceAt: daysAgo(randInt(30, 90)),
        nextServiceAt: daysFromNow(randInt(30, 90)),
        metadata: { fuel: pick(["סולר", "בנזין"]) } as any,
      },
    });
    out.push({ ...v, id });
  }

  return out;
}
