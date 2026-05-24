import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { readClientHints } from "@/lib/http";

export const runtime = "nodejs";

const ChannelSchema = z.enum(["EMAIL", "SMS", "WHATSAPP", "PUSH", "VOICE"]);
const QuerySchema = z.object({
  email: z.string().email(),
  purpose: z.string().min(1).max(120),
});

/**
 * DELETE /api/privacy/consent/:channel?email=...&purpose=...
 * סירוב מיידי לערוץ + תיעוד.
 * אין צורך באימות לחזרה — כללי "right to withdraw" של תיקון 13.
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ channel: string }> },
) {
  const { channel } = await ctx.params;
  const channelParse = ChannelSchema.safeParse(channel.toUpperCase());
  if (!channelParse.success) {
    return NextResponse.json({ error: "INVALID_CHANNEL" }, { status: 400 });
  }

  const url = new URL(req.url);
  const queryParse = QuerySchema.safeParse({
    email: url.searchParams.get("email"),
    purpose: url.searchParams.get("purpose"),
  });
  if (!queryParse.success) {
    return NextResponse.json(
      { error: "VALIDATION_FAILED", issues: queryParse.error.issues },
      { status: 422 },
    );
  }
  const { email, purpose } = queryParse.data;
  const hints = readClientHints(req);

  const user = await prisma.user.findUnique({ where: { email } });
  // אנטי-enumeration: תמיד 200 גנרי
  if (!user) return NextResponse.json({ status: "OPTED_OUT" });

  const existing = await prisma.consent.findUnique({
    where: {
      userId_channel_purpose: {
        userId: user.id,
        channel: channelParse.data,
        purpose,
      },
    },
  });

  if (existing) {
    await prisma.consent.update({
      where: { id: existing.id },
      data: { isActive: false, optOutAt: new Date() },
    });
  }

  await prisma.consentEvent.create({
    data: {
      userId: user.id,
      channel: channelParse.data,
      purpose,
      action: "OPT_OUT",
      ipAddress: hints.ipAddress,
      userAgent: hints.userAgent,
    },
  });

  await audit({
    userId: user.id,
    actor: "user",
    action: "CONSENT_OPT_OUT",
    entity: "Consent",
    entityId: existing?.id ?? null,
    metadata: { channel: channelParse.data, purpose },
    ipAddress: hints.ipAddress,
    userAgent: hints.userAgent,
  });

  return NextResponse.json({ status: "OPTED_OUT" });
}
