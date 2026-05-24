/**
 * OrderItems לכל אירוע — שורות מנות עם FK ל-recipe/product.
 */
import { did } from "../utils/ids.js";
import { round2 } from "../utils/money.js";
import type { SeedContext } from "../context.js";
import type { SeededEvent } from "./events.js";
import { MENU_ITEMS } from "./menu-items.js";
import type { SeededRecipe } from "./recipes.js";

export async function seedOrderItems(
  ctx: SeedContext,
  events: SeededEvent[],
  recipes: SeededRecipe[],
): Promise<void> {
  const { prisma, tenantId } = ctx;
  const recipeMap = new Map(recipes.map((r) => [r.key, r]));

  for (const event of events) {
    // מסננים את ה-menu items של התפריט שנבחר
    const itemsForMenu = MENU_ITEMS.filter((mi) => mi.menuKey === event.menuKey);
    const selected = itemsForMenu.slice(0, Math.min(6, itemsForMenu.length));

    let lineIdx = 0;
    for (const mi of selected) {
      const recipe = mi.recipeKey ? recipeMap.get(mi.recipeKey) : undefined;
      const qty = event.guestCount;
      const unitPrice = mi.price;
      const total = round2(qty * unitPrice);
      const id = did(`oi:${event.id}:${lineIdx}`);
      await prisma.orderItem.upsert({
        where: { id },
        update: {},
        create: {
          id,
          tenantId,
          eventId: event.id,
          recipeId: recipe?.id ?? null,
          name: mi.name,
          description: mi.description ?? null,
          quantity: qty as any,
          unitPrice: unitPrice as any,
          discount: 0 as any,
          totalPrice: total as any,
          notes: mi.category,
        },
      });
      lineIdx++;
    }
  }
}
