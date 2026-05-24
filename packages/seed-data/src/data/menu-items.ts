/**
 * 80 פריטי מנה לכל התפריטים — עברית, מחירים, אלרגנים, ויחס ל-recipes/products.
 */
import { did } from "../utils/ids.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";
import type { SeededMenu } from "./menus.js";
import type { SeededRecipe } from "./recipes.js";

interface MenuItemSpec {
  menuKey: string;
  recipeKey?: string;
  name: string;
  category: string;
  price: number;
  allergens?: string[];
  description?: string;
}

export const MENU_ITEMS: MenuItemSpec[] = [
  // wedding-meat (12 items)
  { menuKey: "wedding-meat", recipeKey: "stuffed-chicken", name: "עוף ממולא אורז ופירות יבשים", category: "מנה ראשונה", price: 75, description: "מנה חמה לפתיחה" },
  { menuKey: "wedding-meat", recipeKey: "kebab-grilled", name: "קבב בקר על האש", category: "מנה עיקרית", price: 95 },
  { menuKey: "wedding-meat", name: "אנטריקוט שף", category: "מנה עיקרית", price: 165, description: "פרוסות אנטריקוט עם רוטב יין אדום" },
  { menuKey: "wedding-meat", recipeKey: "salmon-baked", name: "סלמון אפוי בלימון ודבש", category: "דג", price: 110 },
  { menuKey: "wedding-meat", recipeKey: "hummus", name: "סלטי פתיחה - חומוס, טחינה, מטבוחה", category: "סלטים", price: 35, allergens: ["שומשום"] },
  { menuKey: "wedding-meat", recipeKey: "israeli-salad", name: "סלט ישראלי טרי", category: "סלטים", price: 25 },
  { menuKey: "wedding-meat", recipeKey: "tahdig-rice", name: "אורז פרסי עם זעפרן", category: "צד", price: 30 },
  { menuKey: "wedding-meat", recipeKey: "roasted-veg", name: "ירקות שורש קלויים", category: "צד", price: 28 },
  { menuKey: "wedding-meat", name: "טריו קינוחים", category: "קינוח", price: 45, description: "מוס שוקולד, פאן קוטה לימון, פניני פירות יער", allergens: ["אגוזים", "סויה"] },
  { menuKey: "wedding-meat", name: "בר אלכוהול פתוח", category: "שתייה", price: 85, description: "וויסקי, וודקה, יין אדום ולבן, קוקטיילים" },
  { menuKey: "wedding-meat", recipeKey: "fruit-platter", name: "פלטת פירות העונה", category: "קינוח", price: 25 },
  { menuKey: "wedding-meat", name: "תחנת קפה ומאפים", category: "סיום", price: 35 },

  // bar-mitzvah-meat (10)
  { menuKey: "bar-mitzvah-meat", recipeKey: "schnitzel-classic", name: "שניצל הבית", category: "עיקרית", price: 60 },
  { menuKey: "bar-mitzvah-meat", recipeKey: "kebab-grilled", name: "קבב בקר חריף", category: "עיקרית", price: 75 },
  { menuKey: "bar-mitzvah-meat", recipeKey: "stuffed-grape-leaves", name: "עלי גפן ממולאים", category: "ראשונה", price: 32 },
  { menuKey: "bar-mitzvah-meat", recipeKey: "hummus", name: "מבחר סלטים", category: "סלטים", price: 28, allergens: ["שומשום"] },
  { menuKey: "bar-mitzvah-meat", recipeKey: "couscous-classic", name: "קוסקוס מרוקאי עם ירקות", category: "צד", price: 35 },
  { menuKey: "bar-mitzvah-meat", recipeKey: "lentil-soup", name: "מרק עדשים חם", category: "מרק", price: 22 },
  { menuKey: "bar-mitzvah-meat", recipeKey: "matbukha", name: "מטבוחה מרוקאית", category: "סלטים", price: 18 },
  { menuKey: "bar-mitzvah-meat", name: "תחנת שווארמה", category: "תחנה", price: 65, description: "מנת שווארמה עם פיתה" },
  { menuKey: "bar-mitzvah-meat", recipeKey: "fruit-platter", name: "פלטת פירות + עוגות", category: "קינוח", price: 30 },
  { menuKey: "bar-mitzvah-meat", name: "תחנת קפה", category: "סיום", price: 18 },

  // brit-dairy (10)
  { menuKey: "brit-dairy", recipeKey: "burekas-cheese", name: "בורקס גבינה", category: "מאפה", price: 12, allergens: ["חלב", "גלוטן"] },
  { menuKey: "brit-dairy", name: "פלטת גבינות מובחרות", category: "פלטה", price: 65, allergens: ["חלב"], description: "5 סוגי גבינה עם דבש ואגוזים" },
  { menuKey: "brit-dairy", recipeKey: "shakshuka", name: "שקשוקה אישית", category: "חמה", price: 35, allergens: ["ביצים"] },
  { menuKey: "brit-dairy", recipeKey: "israeli-salad", name: "סלט ישראלי", category: "סלט", price: 22 },
  { menuKey: "brit-dairy", name: "כריכי טונה ופסטרמה", category: "כריכים", price: 28, allergens: ["דגים", "גלוטן"] },
  { menuKey: "brit-dairy", name: "סלט גבינה בולגרית עם זיתים", category: "סלט", price: 28, allergens: ["חלב"] },
  { menuKey: "brit-dairy", name: "מאפה גבינות אישי", category: "מאפה", price: 18, allergens: ["חלב", "גלוטן"] },
  { menuKey: "brit-dairy", recipeKey: "rugelach-chocolate", name: "רוגלך שוקולד", category: "קינוח", price: 22, allergens: ["חלב", "גלוטן"] },
  { menuKey: "brit-dairy", recipeKey: "fruit-platter", name: "פלטת פירות", category: "פירות", price: 22 },
  { menuKey: "brit-dairy", name: "תחנת קפה ונסקפה", category: "שתייה", price: 14 },

  // birthday-pareve (8)
  { menuKey: "birthday-pareve", recipeKey: "salmon-baked", name: "סלמון אפוי", category: "עיקרית", price: 90 },
  { menuKey: "birthday-pareve", recipeKey: "hummus", name: "סלטי פתיחה ים-תיכוניים", category: "סלטים", price: 28, allergens: ["שומשום"] },
  { menuKey: "birthday-pareve", recipeKey: "tahdig-rice", name: "אורז פרסי", category: "צד", price: 25 },
  { menuKey: "birthday-pareve", recipeKey: "roasted-veg", name: "ירקות צלויים", category: "צד", price: 22 },
  { menuKey: "birthday-pareve", recipeKey: "stuffed-grape-leaves", name: "עלי גפן ממולאים", category: "ראשונה", price: 28 },
  { menuKey: "birthday-pareve", recipeKey: "israeli-salad", name: "סלט ישראלי", category: "סלט", price: 18 },
  { menuKey: "birthday-pareve", name: "עוגת קינוח פרווה אישית", category: "קינוח", price: 25, allergens: ["גלוטן", "סויה"] },
  { menuKey: "birthday-pareve", recipeKey: "fruit-platter", name: "פלטת פירות", category: "קינוח", price: 22 },

  // vegetarian (10)
  { menuKey: "vegetarian", recipeKey: "shakshuka", name: "שקשוקה אישית", category: "עיקרית", price: 35, allergens: ["ביצים"] },
  { menuKey: "vegetarian", recipeKey: "hummus", name: "חומוס ביתי + לחם פיתה חם", category: "ראשונה", price: 25, allergens: ["שומשום", "גלוטן"] },
  { menuKey: "vegetarian", recipeKey: "stuffed-grape-leaves", name: "עלי גפן ממולאים", category: "ראשונה", price: 28 },
  { menuKey: "vegetarian", recipeKey: "white-bean-stew", name: "תבשיל שעועית לבנה", category: "עיקרית", price: 38 },
  { menuKey: "vegetarian", recipeKey: "lentil-soup", name: "מרק עדשים", category: "מרק", price: 22 },
  { menuKey: "vegetarian", recipeKey: "couscous-classic", name: "קוסקוס עם ירקות", category: "עיקרית", price: 32 },
  { menuKey: "vegetarian", recipeKey: "matbukha", name: "מטבוחה ופלפלים קלויים", category: "סלט", price: 18 },
  { menuKey: "vegetarian", recipeKey: "israeli-salad", name: "סלט ישראלי", category: "סלט", price: 18 },
  { menuKey: "vegetarian", recipeKey: "roasted-veg", name: "ירקות שורש קלויים", category: "צד", price: 22 },
  { menuKey: "vegetarian", recipeKey: "fruit-platter", name: "פלטת פירות העונה", category: "קינוח", price: 22 },

  // kids (8)
  { menuKey: "kids", recipeKey: "schnitzel-classic", name: "שניצל הבית", category: "עיקרית", price: 35, allergens: ["גלוטן", "ביצים"] },
  { menuKey: "kids", name: "צ'יפס פריך", category: "צד", price: 12 },
  { menuKey: "kids", name: "אורז לבן רגיל", category: "צד", price: 10 },
  { menuKey: "kids", name: "ירקות חיתוך - מלפפון, גזר, פלפל", category: "ירקות", price: 8 },
  { menuKey: "kids", name: "פיתה ופסטרמה", category: "כריך", price: 18 },
  { menuKey: "kids", name: "מיני המבורגרים", category: "עיקרית", price: 28 },
  { menuKey: "kids", name: "קינוח שוקולד", category: "קינוח", price: 12, allergens: ["חלב", "גלוטן"] },
  { menuKey: "kids", name: "מיץ ושתייה קלה", category: "שתייה", price: 8 },

  // vip-tasting (12 - 8 tasting courses + extras)
  { menuKey: "vip-tasting", name: "סשימי סלמון על לחם פחם", category: "טעימה 1", price: 65, allergens: ["דגים"] },
  { menuKey: "vip-tasting", name: "קרפצ'יו פילה בקר עם פטריות שאנטרל", category: "טעימה 2", price: 85 },
  { menuKey: "vip-tasting", recipeKey: "salmon-baked", name: "סלמון מעושן ביתי + אספרגוס", category: "טעימה 3", price: 75 },
  { menuKey: "vip-tasting", name: "ריזוטו עם פטריות פורצ'יני", category: "טעימה 4", price: 80 },
  { menuKey: "vip-tasting", name: "פילה בקר עטוף בעלי גפן", category: "עיקרית 1", price: 165 },
  { menuKey: "vip-tasting", name: "ברווז בסירופ רימונים", category: "עיקרית 2", price: 145, description: "ברווז עם תפו\"א דופיני" },
  { menuKey: "vip-tasting", name: "קינוח שוקולד 70% עם מלח ים", category: "קינוח", price: 55, allergens: ["סויה"] },
  { menuKey: "vip-tasting", name: "פטיפורים שף", category: "קינוח", price: 45, allergens: ["אגוזים", "גלוטן"] },
  { menuKey: "vip-tasting", name: "יין מלווה (Pairing)", category: "שתייה", price: 120 },
  { menuKey: "vip-tasting", name: "קפה אספרסו ושוקולדים", category: "סיום", price: 35 },
  { menuKey: "vip-tasting", name: "מים מינרליים + סודה", category: "שתייה", price: 18 },
  { menuKey: "vip-tasting", name: "אמיוז בוש פתיחה", category: "פתיחה", price: 25 },

  // breakfast-conference (10)
  { menuKey: "breakfast-conference", recipeKey: "shakshuka", name: "שקשוקה אישית בסיר חרס", category: "חמה", price: 25, allergens: ["ביצים"] },
  { menuKey: "breakfast-conference", recipeKey: "burekas-cheese", name: "מבחר בורקסים", category: "מאפים", price: 14, allergens: ["חלב", "גלוטן"] },
  { menuKey: "breakfast-conference", name: "פלטת גבינות וזיתים", category: "פלטה", price: 32, allergens: ["חלב"] },
  { menuKey: "breakfast-conference", name: "סלמון מעושן + קרם גבינה", category: "פלטה", price: 38, allergens: ["דגים", "חלב"] },
  { menuKey: "breakfast-conference", recipeKey: "israeli-salad", name: "סלט ישראלי טרי", category: "סלט", price: 18 },
  { menuKey: "breakfast-conference", name: "סלט טונה + ביצה קשה", category: "סלט", price: 22, allergens: ["דגים", "ביצים"] },
  { menuKey: "breakfast-conference", name: "ספלי קפה + מאפים", category: "שתייה", price: 18 },
  { menuKey: "breakfast-conference", name: "מיץ תפוזים סחוט", category: "שתייה", price: 14 },
  { menuKey: "breakfast-conference", recipeKey: "fruit-platter", name: "פלטת פירות חתוכים", category: "פירות", price: 22 },
  { menuKey: "breakfast-conference", name: "לחמים, ממרחים וריבות", category: "לחמים", price: 14, allergens: ["גלוטן"] },
];

export async function seedMenuItems(
  ctx: SeedContext,
  menus: SeededMenu[],
  recipes: SeededRecipe[],
): Promise<void> {
  const { prisma, tenantId, factor } = ctx;
  const menuMap = new Map(menus.map((m) => [m.key, m]));
  const recipeMap = new Map(recipes.map((r) => [r.key, r]));
  const items = MENU_ITEMS.slice(0, scaled(MENU_ITEMS.length, factor));

  let order = 0;
  for (const item of items) {
    const menu = menuMap.get(item.menuKey);
    if (!menu) continue;
    const recipe = item.recipeKey ? recipeMap.get(item.recipeKey) : undefined;
    const id = did(`mi:${menu.id}:${order}`);
    await prisma.menuItem.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId,
        menuId: menu.id,
        recipeId: recipe?.id ?? null,
        name: item.name,
        description: item.description ?? null,
        category: item.category,
        price: item.price as any,
        quantity: 1 as any,
        sortOrder: order,
        isActive: true,
        metadata: { allergens: item.allergens ?? [] } as any,
      },
    });
    order++;
  }
}
