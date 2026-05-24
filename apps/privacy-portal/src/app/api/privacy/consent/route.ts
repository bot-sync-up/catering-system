import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mintToken, verifyTokenShape } from "@/lib/tokens";
import { buildVerifyUrl, sendEmail } from "@/lib/mailer";
import { audit } from "@/lib/audit";
import { parseJson, readClientHints } from "@/lib/http";

export const runtime = "nodejs";

const ChannelSchema = z.enum(["EMAIL", "SMS", "WHATSAPP", "PUSH", "VOICE"]);

const CreateConsentSchema = z.object({
  email: z.string().email(),
  channel: ChannelSchema,
  purpose: z.string().min(1).max(120),
  source: z.string().max(255).optional(),
  /** עבור flow אימות: יעד אליו נשלח קוד/קישור.
   *  לאימייל ברירת המחדל = email, ל-SMS/WHATSAPP נדרש phone */
  phone: z.string().min(6).max(32).optional(),
});

/**
 * POST /api/privacy/consent
 * Step 1: יצירת בקשת הסכמה במצב לא פעיל + שליחת אימות (double opt-in).
 * Step 2: אישור עם token שמתקבל בקישור — מפעיל את ההסכמה.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  // הבחנה בין שני הסוגים על בסיס נוכחות verifyToken
  if (body && typeof body === "object" && "verifyToken" in (body as object)) {
    return confirmConsent(req, body as { verifyToken: string });
  }
  // אחרת — יצירה
  const parsed = CreateConsentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_FAILED", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const data = parsed.data;
  const hints = readClientHints(req);

  const user = await prisma.user.upsert({
    where: { email: data.email },
    create: { email: data.email, phone: data.phone ?? null },
    update: data.phone ? { phone: data.phone } : {},
  });

  const verifyToken = mintToken("consent-verify");
  const consent = await prisma.consent.upsert({
    where: {
      userId_channel_purpose: {
        userId: user.id,
        channel: data.channel,
        purpose: data.purpose,
      },
    },
    create: {
      userId: user.id,
      channel: data.channel,
      purpose: data.purpose,
      isActive: false,
      verifyToken,
      source: data.source ?? null,
      ipAddress: hints.ipAddress,
      userAgent: hints.userAgent,
    },
    update: {
      verifyToken,
      ipAddress: hints.ipAddress,
      userAgent: hints.userAgent,
    },
  });

  await prisma.consentEvent.create({
    data: {
      userId: user.id,
      channel: data.channel,
      purpose: data.purpose,
      action: "OPT_IN_REQUESTED",
      proof: { source: data.source ?? null },
      ipAddress: hints.ipAddress,
      userAgent: hints.userAgent,
    },
  });

  // שליחת אימות — בערוץ הרלוונטי (כאן: רק אימייל כברירת מחדל)
  await sendEmail({
    to: user.email,
    subject: `אימות הסכמה לערוץ ${data.channel}`,
    body:
      `שלום,\n\nנרשמה בקשה לאישור פנייה אליך בערוץ ${data.channel} עבור: ${data.purpose}.\n` +
      `נדרש אישור כפול — יש ללחוץ על הקישור:\n${buildVerifyUrl("/portal/consents/verify", verifyToken)}\n\n` +
      `ניתן להסיר את ההסכמה בכל עת.\n`,
  });

  await audit({
    userId: user.id,
    actor: "user",
    action: "CONSENT_OPT_IN_REQUESTED",
    entity: "Consent",
    entityId: consent.id,
    metadata: { channel: data.channel, purpose: data.purpose },
    ipAddress: hints.ipAddress,
    userAgent: hints.userAgent,
  });

  return NextResponse.json({ status: "PENDING_VERIFICATION" }, { status: 202 });
}

async function confirmConsent(req: Request, body: { verifyToken: string }) {
  if (!verifyTokenShape(body.verifyToken, "consent-verify")) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });
  }
  const consent = await prisma.consent.findFirst({
    where: { verifyToken: body.verifyToken },
  });
  if (!consent) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const hints = readClientHints(req);
  const updated = await prisma.consent.update({
    where: { id: consent.id },
    data: {
      isActive: true,
      optInAt: new Date(),
      verifyToken: null,
    },
  });
  await prisma.consentEvent.create({
    data: {
      userId: consent.userId,
      channel: consent.channel,
      purpose: consent.purpose,
      action: "OPT_IN_VERIFIED",
      ipAddress: hints.ipAddress,
      userAgent: hints.userAgent,
    },
  });
  await audit({
    userId: consent.userId,
    actor: "user",
    action: "CONSENT_OPT_IN_VERIFIED",
    entity: "Consent",
    entityId: consent.id,
    ipAddress: hints.ipAddress,
    userAgent: hints.userAgent,
  });
  return NextResponse.json({ status: "ACTIVE", consentId: updated.id });
}
