/**
 * 10 המלצות לקוחות אמיתיות בעברית.
 */
import { did } from "../utils/ids.js";
import { daysAgo } from "../utils/dates.js";
import { randInt } from "../utils/rng.js";
import type { SeedContext } from "../context.js";

interface TestimonialSpec {
  key: string;
  customerName: string;
  eventType: string;
  content: string;
  rating: number;
}

export const TESTIMONIALS: TestimonialSpec[] = [
  { key: "t1", customerName: "משפחת ברקוביץ", eventType: "חתונה", content: "השירות היה מושלם, האוכל מדהים והצוות אדיב במיוחד. כל האורחים שיבחו את התפריט וההגשה. תודה רבה!", rating: 5 },
  { key: "t2", customerName: "אסתר כהן", eventType: "בר מצווה", content: "מקצועיות ברמה הגבוהה ביותר. עמדו בכל הזמנים, התפריט היה גמיש לבקשות שלי, והאוכל היה ברמה של מסעדה.", rating: 5 },
  { key: "t3", customerName: "ישראל פרידמן", eventType: "ברית מילה", content: "הבורקסים והגבינות היו פשוט מצוינים. גם בני המשפחה המבוגרים שיבחו את האיכות.", rating: 5 },
  { key: "t4", customerName: "וויקס", eventType: "אירוע חברה", content: "אירחנו 200 אורחים לארוחת בוקר חברה — הכל היה מסודר, יפה, ובזמן. נמליץ בחום!", rating: 5 },
  { key: "t5", customerName: "משפחת מזרחי", eventType: "חתונה", content: "השף משה עשה עבודה מדהימה. הקבב והאנטריקוט פשוט נמסו בפה.", rating: 5 },
  { key: "t6", customerName: "מכבי שירותי בריאות", eventType: "כנס", content: "ארגנו לנו 3 ימי כנס עם 400 משתתפים — אוכל איכותי בכל ארוחה, מבחר מרשים.", rating: 4 },
  { key: "t7", customerName: "רחל גולדברג", eventType: "בת מצווה", content: "התפריט הצמחוני היה יצירתי וטעים — אפילו הילדים אכלו בתיאבון!", rating: 5 },
  { key: "t8", customerName: "משפחת אבוחצירא", eventType: "אירוסין", content: "ארגון מושלם, יחס אישי, ומחיר הוגן. ממליצים בלב שלם.", rating: 5 },
  { key: "t9", customerName: "Check Point", eventType: "כנס", content: "ארוחת הבוקר לכנס שלנו הייתה ברמה גבוהה, גם הצוות בשטח היה מקצועי ומסביר פנים.", rating: 4 },
  { key: "t10", customerName: "משפחת שטרן", eventType: "בר מצווה", content: "תודה על אירוע משפחתי בלתי נשכח. השווארמה והקבב היו מדהימים, וגם הקינוחים.", rating: 5 },
];

export async function seedTestimonials(ctx: SeedContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  for (const t of TESTIMONIALS) {
    const id = did(`testimonial:${tenantId}:${t.key}`);
    await prisma.testimonial.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId,
        customerName: t.customerName,
        eventType: t.eventType,
        content: t.content,
        rating: t.rating,
        isPublished: true,
        publishedAt: daysAgo(randInt(7, 180)),
      },
    });
  }
}
