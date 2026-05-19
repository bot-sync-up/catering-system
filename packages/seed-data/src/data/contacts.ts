/**
 * אנשי קשר — primary contact לכל לקוח B2B/Institution.
 */
import { did } from "../utils/ids.js";
import { randomFirstName, randomLastName, randomMobile } from "../utils/hebrew.js";
import { chance } from "../utils/rng.js";
import type { SeedContext } from "../context.js";
import type { SeededCustomer } from "./customers.js";

export async function seedContacts(
  ctx: SeedContext,
  customers: SeededCustomer[],
): Promise<void> {
  const { prisma, tenantId } = ctx;

  for (const customer of customers) {
    if (customer.type === "INDIVIDUAL") continue;

    // איש קשר עיקרי
    const first = randomFirstName();
    const last = randomLastName();
    const primaryId = did(`contact:${customer.id}:primary`);
    await prisma.contactPerson.upsert({
      where: { id: primaryId },
      update: {},
      create: {
        id: primaryId,
        tenantId,
        customerId: customer.id,
        firstName: first,
        lastName: last,
        role: "מנהל אירועים",
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${customer.email?.split("@")[1] ?? "example.co.il"}`,
        phone: randomMobile(),
        mobile: randomMobile(),
        isPrimary: true,
      },
    });

    // לפעמים איש קשר משני
    if (chance(0.4)) {
      const f2 = randomFirstName();
      const l2 = randomLastName();
      const secondaryId = did(`contact:${customer.id}:secondary`);
      await prisma.contactPerson.upsert({
        where: { id: secondaryId },
        update: {},
        create: {
          id: secondaryId,
          tenantId,
          customerId: customer.id,
          firstName: f2,
          lastName: l2,
          role: "סגן מנהל",
          phone: randomMobile(),
          mobile: randomMobile(),
          isPrimary: false,
        },
      });
    }
  }
}
