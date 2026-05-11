import { NextResponse } from 'next/server';
import { readJson } from '@/lib/db';
import { r2Storage } from '@contracts/core';
import type { Contract } from '@contracts/core';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const list = await readJson<Contract[]>('contracts.json', []);
  const contract = list.find((c) => c.id === params.id);
  if (!contract || !contract.pdfStorageKey) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const buf = await r2Storage.getPdf(contract.pdfStorageKey);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${contract.id}.pdf"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
