/**
 * כתובות — לכל לקוח כתובת אחת/שתיים בערים ישראליות אמיתיות.
 */
import { did } from "../utils/ids.js";
import { randomCity, randomStreet } from "../utils/hebrew.js";
import { randInt, chance } from "../utils/rng.js";
import type { SeedContext } from "../context.js";
import type { SeededCustomer } from "./customers.js";

export async function seedAddresses(
  ctx: SeedContext,
  customers: SeededCustomer[],
): Promise<void> {
  const { prisma, tenantId } = ctx;

  for (const customer of customers) {
    const billingId = did(`addr:${customer.id}:billing`);
    await prisma.address.upsert({
      where: { id: billingId },
      update: {},
      create: {
        id: billingId,
        tenantId,
        customerId: customer.id,
        type: "BILLING",
        street: randomStreet(),
        houseNum: String(randInt(1, 250)),
        city: randomCity(),
        postalCode: String(randInt(1000000, 9999999)),
        country: "IL",
        isPrimary: true,
      },
    });

    if (customer.type !== "INDIVIDUAL" && chance(0.5)) {
      const shipId = did(`addr:${customer.id}:shipping`);
      await prisma.address.upsert({
        where: { id: shipId },
        update: {},
        create: {
          id: shipId,
          tenantId,
          customerId: customer.id,
          type: "SHIPPING",
          street: randomStreet(),
          houseNum: String(randInt(1, 250)),
          city: randomCity(),
          postalCode: String(randInt(1000000, 9999999)),
          country: "IL",
        },
      });
    }
  }
}
