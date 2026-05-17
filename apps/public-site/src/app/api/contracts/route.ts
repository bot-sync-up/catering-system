import { NextResponse } from 'next/server';
import { ContractSchema, buildContractPdf, computeReminderJobs, getTemplate, r2Storage } from '@contracts/core';
import type { Contract } from '@contracts/core';
import { appendJson, readJson, writeJson } from '@/lib/db';

export const runtime = 'nodejs'; // pdfkit requires Node, not Edge

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const tpl = getTemplate(body.templateId);
  if (!tpl) return NextResponse.json({ error: 'unknown_template' }, { status: 422 });

  const now = new Date().toISOString();
  const contract: Contract = {
    id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    templateId: body.templateId,
    title: body.title ?? tpl.title,
    status: body.signatureDataUrl ? 'signed' : 'draft',
    createdAt: now,
    updatedAt: now,
    effectiveFrom: body.effectiveFrom ?? now,
    effectiveTo: body.effectiveTo,
    renewalReminderDays: body.renewalReminderDays ?? tpl.defaultRenewalDays,
    provider: body.provider,
    client: body.client,
    fields: body.fields ?? {},
    totalAmount: Number(body.totalAmount) || 0,
    currency: body.currency ?? 'ILS',
    signatureProvider: body.signatureProvider ?? 'canvas',
    signatureDataUrl: body.signatureDataUrl,
    signedAt: body.signatureDataUrl ? now : undefined,
    signedIp: body.signatureDataUrl ? (req.headers.get('x-forwarded-for') ?? undefined) : undefined,
  };

  const parsed = ContractSchema.safeParse(contract);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Build PDF
  const pdf = await buildContractPdf({ contract: parsed.data });
  const key = `${parsed.data.id}.pdf`;
  const stored = await r2Storage.putPdf(key, pdf);
  parsed.data.pdfStorageKey = stored.key;

  // Persist contract record
  await appendJson<Contract>('contracts.json', parsed.data);

  // Schedule reminder jobs
  const reminders = computeReminderJobs(parsed.data);
  if (reminders.length) {
    const existing = await readJson<any[]>('reminders.json', []);
    await writeJson('reminders.json', [...existing, ...reminders]);
  }

  return NextResponse.json({ id: parsed.data.id, pdfUrl: stored.url ?? `/api/contracts/${parsed.data.id}/pdf` });
}

export async function GET() {
  const list = await readJson<Contract[]>('contracts.json', []);
  return NextResponse.json({
    contracts: list.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      createdAt: c.createdAt,
      client: c.client.name,
      total: c.totalAmount,
    })),
  });
}
