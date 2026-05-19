/**
 * יוצר tenant "קייטרינג טעימים" — ברירת מחדל לכל ה-seed.
 * vatRate=18, ILS, Asia/Jerusalem, locale=he-IL.
 */
import type { PrismaClient } from "@prisma/client";
import { did } from "../utils/ids.js";
import { toDecimal } from "../utils/money.js";

export interface TenantSeed {
  id: string;
  slug: string;
  name: string;
  hebrewName: string;
}

export async function seedTenant(
  prisma: PrismaClient,
  slug = "demo",
): Promise<TenantSeed> {
  const id = did(`tenant:${slug}`);
  const data = {
    id,
    slug,
    name: "Taimim Catering",
    hebrewName: "קייטרינג טעימים",
    domain: `${slug}.aneh-platform.co.il`,
    timezone: "Asia/Jerusalem",
    locale: "he-IL",
    currency: "ILS",
    vatRate: toDecimal(18),
    active: true,
    settings: {
      businessHours: { start: "08:00", end: "20:00" },
      defaultEventDuration: 4,
      kosherCertification: "בד\"ץ העדה החרדית",
      contact: {
        phone: "03-5550100",
        email: "office@taimim.co.il",
        address: "התעשייה 12, אזור התעשייה תל אביב",
      },
    } as any,
  };

  await prisma.tenant.upsert({
    where: { id },
    update: {
      name: data.name,
      hebrewName: data.hebrewName,
      domain: data.domain,
      settings: data.settings,
    },
    create: data,
  });

  return { id, slug, name: data.name, hebrewName: data.hebrewName };
}
