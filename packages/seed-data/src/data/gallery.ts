/**
 * 30 פריטי גלריה — תמונות אירועים.
 */
import { did } from "../utils/ids.js";
import { pick } from "../utils/rng.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";

const TITLES = [
  "חתונה מפוארת באולמי גליל",
  "ברית מילה משפחתית",
  "בר מצווה במלון דן",
  "כנס חברת הייטק",
  "אירוע צדקה",
  "ארוחת ערב גורמה",
  "תפריט פסח",
  "תחנת שווארמה",
  "פלטת גבינות",
  "סלטים ים-תיכוניים",
  "אנטריקוט שף",
  "סלמון על הגריל",
  "קוסקוס מרוקאי",
  "תחנת קפה ומאפים",
  "קינוחי טריו",
  "אורז פרסי",
  "פלטת פירות",
  "מנגל אירוע פרטי",
  "סדר פסח מסורתי",
  "ארוחת שבת חגיגית",
];

const CATEGORIES = ["wedding", "brit", "bar_mitzvah", "corporate", "food", "venue", "events"];

export async function seedGallery(ctx: SeedContext): Promise<void> {
  const { prisma, tenantId, factor } = ctx;
  const total = scaled(30, factor);

  for (let i = 0; i < total; i++) {
    const id = did(`gallery:${tenantId}:${i}`);
    const title = pick(TITLES);
    const category = pick(CATEGORIES);
    await prisma.gallery.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId,
        title: `${title} ${i + 1}`,
        description: `תמונה מ${title}`,
        imageUrl: `https://cdn.example.co.il/gallery/${id}.jpg`,
        thumbnailUrl: `https://cdn.example.co.il/gallery/${id}_thumb.jpg`,
        category,
        tags: [category, "demo"],
        sortOrder: i,
        isPublished: true,
      },
    });
  }
}
