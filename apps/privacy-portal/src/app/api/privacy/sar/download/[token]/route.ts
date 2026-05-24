import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { verifyTokenShape } from "@/lib/tokens";
import { audit } from "@/lib/audit";
import { readClientHints } from "@/lib/http";

export const runtime = "nodejs";

/**
 * GET /api/privacy/sar/download/:token
 * מחזיר את ה-ZIP שהפיק worker/sarBuilder.
 * הטוקן הוא "bearer" — מי שמחזיק בו יורד.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!verifyTokenShape(token, "sar-download")) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });
  }

  const sar = await prisma.sarRequest.findUnique({
    where: { downloadToken: token },
  });
  if (!sar) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (sar.status !== "READY" && sar.status !== "DELIVERED") {
    return NextResponse.json({ error: "NOT_READY", status: sar.status }, { status: 409 });
  }
  if (sar.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "EXPIRED" }, { status: 410 });
  }
  if (!sar.artifactPath) {
    return NextResponse.json({ error: "ARTIFACT_MISSING" }, { status: 500 });
  }

  const buf = await readFile(sar.artifactPath);
  // מסמנים DELIVERED בלוג ראשון בלבד
  if (sar.status === "READY") {
    await prisma.sarRequest.update({
      where: { id: sar.id },
      data: { status: "DELIVERED" },
    });
    const hints = readClientHints(req);
    await audit({
      userId: sar.userId,
      actor: "user",
      action: "SAR_DELIVERED",
      entity: "SarRequest",
      entityId: sar.id,
      ipAddress: hints.ipAddress,
      userAgent: hints.userAgent,
    });
  }

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="privacy-export-${sar.id}.zip"`,
      "cache-control": "no-store",
    },
  });
}
