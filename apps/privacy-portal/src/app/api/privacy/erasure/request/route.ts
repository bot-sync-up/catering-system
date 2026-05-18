import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mintToken } from "@/lib/tokens";
import { audit } from "@/lib/audit";
import { buildVerifyUrl, sendEmail } from "@/lib/mailer";
import { parseJson, readClientHints } from "@/lib/http";

export const runtime = "nodejs";

const RequestSchema = z.object({
  email: z.string().email(),
  reason: z.string().max(1000).optional(),
  /** היקפי המחיקה — chrome ל-UI, ל-worker זה רק רמז */
  scope: z
    .object({
      marketing: z.boolean().default(true),
      profile: z.boolean().default(true),
      orders: z.boolean().default(false), // ברירת מחדל: לא מוחקים מסיבת חוק (7 שנים)
      events: z.boolean().default(true),
    })
    .default({ marketing: true, profile: true, orders: false, events: true }),
});

/**
 * POST /api/privacy/erasure/request
 * יוצר בקשת מחיקה במצב PENDING_VERIFICATION ושולח מייל double opt-in.
 */
export async function POST(req: Request) {
  const parsed = await parseJson(req, RequestSchema);
  if (!parsed.ok) return parsed.response;
  const { email, reason, scope } = parsed.data;
  const hints = readClientHints(req);

  const user = await prisma.user.findUnique({ where: { email } });
  // נחזיר תשובה אחידה גם אם לא קיים — אנטי-enumeration
  if (!user) {
    return NextResponse.json(
      { status: "PENDING_VERIFICATION", message: "במידה והאימייל קיים — נשלח קישור אימות." },
      { status: 202 },
    );
  }

  const approveToken = mintToken("erasure-approve");
  const erasure = await prisma.erasureRequest.create({
    data: {
      userId: user.id,
      approveToken,
      reason: reason ?? null,
      scope: scope as object,
      status: "PENDING_VERIFICATION",
    },
  });

  const approveUrl = buildVerifyUrl("/api/privacy/erasure/approve", approveToken);
  await sendEmail({
    to: user.email,
    subject: "אישור בקשת מחיקת נתונים",
    body:
      `שלום,\n\nהתקבלה בקשה למחוק את הנתונים האישיים שלך מהמערכת (תיקון 13 לחוק הגנת הפרטיות).\n` +
      `שים לב: חלק מהמידע, ובכלל זה חשבוניות מס, נדרש לשמירה בחוק לפרק זמן של 7 שנים, ויעבור אנונימיזציה במקום מחיקה מלאה.\n\n` +
      `לאישור סופי לחץ כאן: ${approveUrl}\n\n` +
      `אם לא ביקשת — התעלם מההודעה. בקשה לא מאומתת תפוג תוך 30 ימים.\n`,
  });

  await audit({
    userId: user.id,
    actor: "user",
    action: "ERASURE_REQUESTED",
    entity: "ErasureRequest",
    entityId: erasure.id,
    metadata: { scope },
    ipAddress: hints.ipAddress,
    userAgent: hints.userAgent,
  });

  return NextResponse.json(
    { status: "PENDING_VERIFICATION", message: "נשלח קישור אישור — נדרשת אישור סופי." },
    { status: 202 },
  );
}
