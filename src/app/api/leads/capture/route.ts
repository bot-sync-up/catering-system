// Public lead-capture endpoint. Used by landing pages / marketing forms.
// Captures UTM + referrer automatically.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '~/server/db';

const captureSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  source: z
    .enum(['REFERRAL', 'ADVERTISEMENT', 'ORGANIC', 'EVENT', 'COLD_OUTREACH', 'PARTNER', 'WEBSITE', 'OTHER'])
    .default('WEBSITE'),
  value: z.number().default(0),
  contact: z
    .object({
      name: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  utm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      term: z.string().optional(),
      content: z.string().optional(),
    })
    .optional(),
  referrer: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const pipeline = await prisma.pipeline.findFirst({ where: { isDefault: true }, include: { stages: { orderBy: { order: 'asc' } } } });
  if (!pipeline || pipeline.stages.length === 0) {
    return NextResponse.json({ error: 'no default pipeline' }, { status: 500 });
  }
  const firstStage = pipeline.stages[0];

  // Create or attach customer if contact info provided
  let customerId: string | undefined;
  if (data.contact) {
    const existing = data.contact.email
      ? await prisma.customer.findFirst({ where: { email: data.contact.email } })
      : null;
    if (existing) {
      customerId = existing.id;
    } else {
      const c = await prisma.customer.create({
        data: {
          type: 'B2C',
          status: 'PROSPECT',
          displayName: data.contact.name,
          email: data.contact.email,
          phone: data.contact.phone,
        },
      });
      customerId = c.id;
    }
  }

  const lead = await prisma.lead.create({
    data: {
      title: data.title,
      description: data.description,
      source: data.source,
      value: data.value,
      pipelineId: pipeline.id,
      stageId: firstStage.id,
      customerId,
      utmSource: data.utm?.source,
      utmMedium: data.utm?.medium,
      utmCampaign: data.utm?.campaign,
      utmTerm: data.utm?.term,
      utmContent: data.utm?.content,
      referrer: data.referrer,
    },
  });
  return NextResponse.json({ ok: true, leadId: lead.id });
}
