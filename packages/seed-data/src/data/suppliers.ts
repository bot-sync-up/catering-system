/**
 * 15 ספקים אמיתיים — משק חי, שוק כרמל, יין מילגרם, וכו'.
 */
import { did } from "../utils/ids.js";
import { randomTaxId, randomLandline } from "../utils/hebrew.js";
import { randInt } from "../utils/rng.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";

interface SupplierSpec {
  key: string;
  name: string;
  hebrewName: string;
  category: "meat" | "produce" | "wine" | "dairy" | "dry" | "fish" | "bread" | "disposables";
  rating: number;
  paymentTermDays: number;
}

export const SUPPLIERS: SupplierSpec[] = [
  { key: "meshek-chai", name: "Meshek Chai", hebrewName: "משק חי - בשר ועופות", category: "meat", rating: 5, paymentTermDays: 30 },
  { key: "tnuva", name: "Tnuva", hebrewName: "תנובה", category: "dairy", rating: 5, paymentTermDays: 60 },
  { key: "shuk-carmel", name: "Shuk HaCarmel", hebrewName: "ירקות שוק הכרמל", category: "produce", rating: 4, paymentTermDays: 14 },
  { key: "milgam", name: "Milgam Wines", hebrewName: "יין מילגמ", category: "wine", rating: 5, paymentTermDays: 45 },
  { key: "yarden-wines", name: "Yarden", hebrewName: "יקבי ירדן", category: "wine", rating: 5, paymentTermDays: 45 },
  { key: "tara", name: "Tara", hebrewName: "תנובת תרה - חלב", category: "dairy", rating: 4, paymentTermDays: 45 },
  { key: "berman", name: "Berman Bakery", hebrewName: "מאפיית ברמן", category: "bread", rating: 5, paymentTermDays: 30 },
  { key: "angel", name: "Angel Bakeries", hebrewName: "מאפיות אנג'ל", category: "bread", rating: 4, paymentTermDays: 30 },
  { key: "shufersal-pro", name: "Shufersal Pro", hebrewName: "שופרסל פרו", category: "dry", rating: 4, paymentTermDays: 60 },
  { key: "carmel-fish", name: "Carmel Fish", hebrewName: "דגי הכרמל", category: "fish", rating: 4, paymentTermDays: 14 },
  { key: "neto", name: "Neto", hebrewName: "נטו מלינדה", category: "dry", rating: 4, paymentTermDays: 45 },
  { key: "of-tov", name: "Of Tov", hebrewName: "עוף טוב", category: "meat", rating: 5, paymentTermDays: 30 },
  { key: "soglowek", name: "Soglowek", hebrewName: "זוגלובק", category: "meat", rating: 4, paymentTermDays: 30 },
  { key: "keter-disposables", name: "Keter", hebrewName: "כתר חד\"פ", category: "disposables", rating: 3, paymentTermDays: 30 },
  { key: "yofi-yeladim", name: "Yofi Yeladim", hebrewName: "יופי ילדים - חד\"פ צבעוני", category: "disposables", rating: 4, paymentTermDays: 30 },
];

export interface SeededSupplier extends SupplierSpec {
  id: string;
}

export async function seedSuppliers(ctx: SeedContext): Promise<SeededSupplier[]> {
  const { prisma, tenantId, factor } = ctx;
  const count = scaled(SUPPLIERS.length, factor);
  const selected = SUPPLIERS.slice(0, count);
  const out: SeededSupplier[] = [];

  for (const s of selected) {
    const id = did(`supplier:${tenantId}:${s.key}`);
    await prisma.supplier.upsert({
      where: { id },
      update: { rating: s.rating, isActive: true },
      create: {
        id,
        tenantId,
        name: s.name,
        hebrewName: s.hebrewName,
        taxId: randomTaxId(),
        contactName: `נציג ${s.hebrewName}`,
        email: `orders@${s.key}.co.il`,
        phone: randomLandline(),
        address: `אזור התעשייה, ${["תל אביב", "חיפה", "אשדוד", "פתח תקווה"][randInt(0, 3)]}`,
        paymentTermDays: s.paymentTermDays,
        rating: s.rating,
        isActive: true,
        metadata: { category: s.category } as any,
      },
    });
    out.push({ ...s, id });
  }

  return out;
}
