/**
 * 8 תפריטים — בשרי-חתונה, בשרי-בר מצווה, חלבי-ברית, פרווה-יום הולדת,
 * צמחוני, ילדים, VIP, ארוחת בוקר-כנס.
 */
import { did } from "../utils/ids.js";
import type { SeedContext } from "../context.js";

export interface MenuSpec {
  key: string;
  name: string;
  description: string;
  pricePerPerson: number;
}

export const MENUS: MenuSpec[] = [
  { key: "wedding-meat", name: "תפריט חתונה בשרי - VIP", description: "תפריט מלא, חלק חלק, 4 מנות + קינוחים", pricePerPerson: 380 },
  { key: "bar-mitzvah-meat", name: "תפריט בר מצווה בשרי", description: "מנות פתיחה, עיקריות, ותחנות בוקר", pricePerPerson: 280 },
  { key: "brit-dairy", name: "תפריט ברית מילה חלבי", description: "פלטות גבינות, סלטים, בורקסים ומאפים", pricePerPerson: 145 },
  { key: "birthday-pareve", name: "תפריט יום הולדת פרווה", description: "ללא בשר וללא חלב — אידיאלי לאירוע מעורב", pricePerPerson: 165 },
  { key: "vegetarian", name: "תפריט צמחוני מלא", description: "מנות צמחיות יצירתיות וים-תיכוניות", pricePerPerson: 155 },
  { key: "kids", name: "תפריט ילדים", description: "שניצל, אורז, צ'יפס, ירקות חיתוך וקינוח קל", pricePerPerson: 75 },
  { key: "vip-tasting", name: "תפריט טעימות VIP", description: "8 מנות שף בקטן — חוויית טעימות אקסקלוסיבית", pricePerPerson: 580 },
  { key: "breakfast-conference", name: "ארוחת בוקר לכנס", description: "סלטים, בורקסים, סלים, גבינות, דגים מלוחים", pricePerPerson: 95 },
];

export interface SeededMenu extends MenuSpec {
  id: string;
}

export async function seedMenus(ctx: SeedContext): Promise<SeededMenu[]> {
  const { prisma, tenantId } = ctx;
  const out: SeededMenu[] = [];

  for (const m of MENUS) {
    const id = did(`menu:${tenantId}:${m.key}`);
    await prisma.menu.upsert({
      where: { id },
      update: { name: m.name, description: m.description, pricePerPerson: m.pricePerPerson as any },
      create: {
        id,
        tenantId,
        name: m.name,
        description: m.description,
        pricePerPerson: m.pricePerPerson as any,
        isActive: true,
        metadata: { category: m.key } as any,
      },
    });
    out.push({ ...m, id });
  }

  return out;
}
