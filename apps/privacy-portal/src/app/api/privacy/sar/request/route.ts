import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSarQueue } from "@/lib/queue";
import { defaultSarExpiry, mintToken } from "@/lib/tokens";
import { audit } from "@/lib/audit";
import { buildVerifyUrl, sendEmail } from "@/lib/mailer";
import { parseJson, readClientHints } from "@/lib/http";

export const runtime = "nodejs";

const RequestSchema = z.object({
  email: z.string().email("נדרשת כתובת אימייל תקינה"),
  fullName: z.string().min(1).optional(),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/privacy/sar/request
 * צרכן מבקש לקבל את כל המידע השמור עליו. נדרש double opt-in:
 *  1. אנו מייצרים בקשה עם verifyToken
 *  2. שולחים מייל אימות
 *  3. רק לאחר GET /verify מתחיל ה-job
 */
export async function POST(req: Request) {
  const parsed = await parseJson(req, RequestSchema);
  if (!parsed.ok) return parsed.response;
  const { email, fullName } = parsed.data;
  const hints = readClientHints(req);

  // upsert משתמש לפי email — לא חושף האם קיים (אנטי-enumeration)
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, fullName: fullName ?? null },
    update: fullName ? { fullName } : {},
  });

  const verifyToken = mintToken("sar-verify");
  const sar = await prisma.sarRequest.create({
    data: {
      userId: user.id,
      verifyToken,
      expiresAt: defaultSarExpiry(),
      status: "PENDING_VERIFICATION",
    },
  });

  const verifyUrl = buildVerifyUrl("/api/privacy/sar/status", verifyToken);
  await sendEmail({
    to: email,
    subject: "אימות בקשת עיון במידע אישי",
    body:
      `שלום,\n\nהתקבלה בקשתך לעיון במידע השמור אצלנו, בהתאם לחוק הגנת הפרטיות (תיקון 13).\n` +
      `כדי לאשר את הבקשה, יש ללחוץ על הקישור הבא בתוך 30 ימים:\n\n${verifyUrl}\n\n` +
      `אם לא ביקשת, ניתן להתעלם מהודעה זו.\n`,
  });

  await audit({
    userId: user.id,
    actor: "user",
    action: "SAR_REQUESTED",
    entity: "SarRequest",
    entityId: sar.id,
    metadata: { reason: parsed.data.reason ?? null },
    ipAddress: hints.ipAddress,
    userAgent: hints.userAgent,
  });

  // לא מחזירים אם משתמש קיים או לא — תמיד 202 גנרי
  return NextResponse.json(
    {
      status: "PENDING_VERIFICATION",
      message: "אם פרטיך נמצאו במערכת — נשלח מייל אימות. יש לאמת תוך 30 ימים.",
    },
    { status: 202 },
  );
}

/**
 * GET /api/privacy/sar/verify/:token — מאמת ומפעיל את ה-job.
 * מטעמי פשטות הקישור מצביע ל-status שמטפל גם באימות (route חכם).
 * עם זאת, כדי לשמור על חלוקה ברורה, נחשוף גם endpoint ייעודי.
 */
export async function PUT(req: Request) {
  const parsed = await parseJson(
    req,
    z.object({ verifyToken: z.string() }),
  );
  if (!parsed.ok) return parsed.response;
  const { verifyToken } = parsed.data;
  const hints = readClientHints(req);

  const sar = await prisma.sarRequest.findUnique({ where: { verifyToken } });
  if (!sar) {
    return NextResponse.json({ error: "TOKEN_NOT_FOUND" }, { status: 404 });
  }
  if (sar.status !== "PENDING_VERIFICATION") {
    return NextResponse.json({ status: sar.status }, { status: 200 });
  }
  if (sar.expiresAt.getTime() < Date.now()) {
    await prisma.sarRequest.update({
      where: { id: sar.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "EXPIRED" }, { status: 410 });
  }

  const downloadToken = mintToken("sar-download");
  const updated = await prisma.sarRequest.update({
    where: { id: sar.id },
    data: { status: "VERIFIED", verifiedAt: new Date(), downloadToken },
  });

  // הכנסת job ל-BullMQ — sarBuilder ירים, יבנה ZIP, ויעדכן ל-READY
  const job = await getSarQueue().add(
    "build-sar",
    { sarRequestId: updated.id },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    },
  );
  await prisma.sarRequest.update({
    where: { id: updated.id },
    data: { jobId: job.id ?? null, status: "IN_PROGRESS" },
  });

  await audit({
    userId: sar.userId,
    actor: "user",
    action: "SAR_VERIFIED",
    entity: "SarRequest",
    entityId: sar.id,
    ipAddress: hints.ipAddress,
    userAgent: hints.userAgent,
  });

  return NextResponse.json({ status: "IN_PROGRESS", downloadToken });
}
