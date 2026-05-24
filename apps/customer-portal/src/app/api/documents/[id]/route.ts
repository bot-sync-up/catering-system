import { requireUser } from '@/lib/session';
import { getOrder } from '@/lib/orders';

// Returns a tiny PDF placeholder for the order's invoice.
// In production: render a real invoice from the billing system.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); } catch { return new Response('unauthorized', { status: 401 }); }
  const o = getOrder(id);
  if (!o || o.userId !== user.id) return new Response('not found', { status: 404 });

  // Minimal valid PDF (single page, says "Invoice <id>").
  const text = `Invoice ${o.id} — Total ${o.total} ILS`;
  const pdf = buildMinimalPdf(text);
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice_${o.id}.pdf"`
    }
  });
}

function buildMinimalPdf(text: string): Uint8Array {
  // Hand-rolled tiny PDF. Latin-1 only — fine for demo.
  const safe = text.replace(/[()\\]/g, '');
  const objects: string[] = [];
  objects.push('1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj');
  objects.push('2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj');
  objects.push('3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj');
  const stream = `BT /F1 18 Tf 72 760 Td (${safe}) Tj ET`;
  objects.push(`4 0 obj <</Length ${stream.length}>> stream\n${stream}\nendstream endobj`);
  objects.push('5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj');

  const header = '%PDF-1.4\n';
  let body = header;
  const offsets: number[] = [];
  for (const o of objects) {
    offsets.push(body.length);
    body += o + '\n';
  }
  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) body += `${String(off).padStart(10, '0')} 00000 n \n`;
  body += `trailer <</Size ${objects.length + 1} /Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(body);
}
