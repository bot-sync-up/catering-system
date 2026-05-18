import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTokenShape } from "@/lib/tokens";
import { getErasureQueue } from "@/lib/queue";
import { audit } from "@/lib/audit";
import { readClientHints } from "@/lib/http";

export const runtime = "nodejs";

/**
 * POST /api/privacy/erasure/approve/:token
 * אישור סופי על ידי המשתמש (קליק מתוך המייל).
 * מעביר לסטטוס APPROVED ומפעיל worker erasureExecutor.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!verifyTokenShape(token, "erasure-approve")) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });
  }
  const erasure = await prisma.erasureRequest.findUnique({
    where: { approveToken: token },
  });
  if (!erasure) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (erasure.status !== "PENDING_VERIFICATION") {
    return NextResponse.json({ status: erasure.status }, { status: 200 });
  }

  const updated = await prisma.erasureRequest.update({
    where: { id: erasure.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  const job = await getErasureQueue().add(
    "execute-erasure",
    { erasureRequestId: updated.id },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    },
  );
  await prisma.erasureRequest.update({
    where: { id: updated.id },
    data: { jobId: job.id ?? null, status: "IN_PROGRESS" },
  });

  const hints = readClientHints(req);
  await audit({
    userId: erasure.userId,
    actor: "user",
    action: "ERASURE_APPROVED",
    entity: "ErasureRequest",
    entityId: erasure.id,
    ipAddress: hints.ipAddress,
    userAgent: hints.userAgent,
  });

  return NextResponse.json({ status: "IN_PROGRESS" });
}
