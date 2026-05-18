import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTokenShape } from "@/lib/tokens";

export const runtime = "nodejs";

/**
 * GET /api/privacy/sar/status/:token
 * משמש שני שימושים:
 *  - token של verify (PENDING_VERIFICATION) — מסיים אימות.
 *  - token של download — מציג סטטוס נוכחי בלבד.
 * הגישה ציבורית (יש "סוד" בטוקן עצמו).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  const isVerify = verifyTokenShape(token, "sar-verify");
  const isDownload = verifyTokenShape(token, "sar-download");
  if (!isVerify && !isDownload) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });
  }

  const sar = await prisma.sarRequest.findFirst({
    where: isVerify ? { verifyToken: token } : { downloadToken: token },
  });
  if (!sar) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (sar.expiresAt.getTime() < Date.now() && sar.status !== "DELIVERED") {
    return NextResponse.json({ status: "EXPIRED" }, { status: 410 });
  }

  return NextResponse.json({
    id: sar.id,
    status: sar.status,
    createdAt: sar.createdAt.toISOString(),
    verifiedAt: sar.verifiedAt?.toISOString() ?? null,
    completedAt: sar.completedAt?.toISOString() ?? null,
    expiresAt: sar.expiresAt.toISOString(),
    downloadAvailable: sar.status === "READY" || sar.status === "DELIVERED",
    failReason: sar.failReason ?? null,
  });
}
