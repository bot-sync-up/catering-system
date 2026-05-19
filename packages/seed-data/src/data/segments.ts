/**
 * סגמנטים — מאוחסנים כ-Tags לקטגוריות.
 */
import { did } from "../utils/ids.js";
import type { SeedContext } from "../context.js";

export const SEGMENTS = [
  { name: "VIP", color: "#d4af37" },
  { name: "חוזרים", color: "#10b981" },
  { name: "חתונות", color: "#ec4899" },
  { name: "ברית מילה", color: "#06b6d4" },
  { name: "B2B-הייטק", color: "#3b82f6" },
  { name: "מוסדות בריאות", color: "#84cc16" },
  { name: "ממשלתי", color: "#6366f1" },
  { name: "פוטנציאלי-חם", color: "#f59e0b" },
];

export async function seedSegments(ctx: SeedContext): Promise<void> {
  const { prisma, tenantId } = ctx;

  for (const seg of SEGMENTS) {
    const id = did(`tag:${tenantId}:${seg.name}`);
    await prisma.tag.upsert({
      where: { id },
      update: { color: seg.color },
      create: {
        id,
        tenantId,
        name: seg.name,
        color: seg.color,
      },
    });
  }
}
