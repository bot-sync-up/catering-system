import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/privacy/consent-history/:userId
 * מחזיר את כל אירועי ההסכמה לאותו משתמש (immutable log).
 * הגנה: בפרודקשן יש לוודא שהקריאה מוגנת ב-session admin
 * או שהמשתמש קורא רק את עצמו (כאן: בודק header x-actor).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;
  const actor = req.headers.get("x-actor") ?? "anonymous";

  // הרשאות בסיסיות: admin רואה הכל, משתמש רואה את עצמו, אחרת 403
  if (!actor.startsWith("admin:") && actor !== `user:${userId}`) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const [user, events, current] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.consentEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.consent.findMany({ where: { userId } }),
  ]);

  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    userId,
    current: current.map((c) => ({
      channel: c.channel,
      purpose: c.purpose,
      isActive: c.isActive,
      optInAt: c.optInAt?.toISOString() ?? null,
      optOutAt: c.optOutAt?.toISOString() ?? null,
    })),
    events: events.map((e) => ({
      id: e.id,
      channel: e.channel,
      purpose: e.purpose,
      action: e.action,
      createdAt: e.createdAt.toISOString(),
      ipAddress: e.ipAddress,
      proof: e.proof,
    })),
  });
}
