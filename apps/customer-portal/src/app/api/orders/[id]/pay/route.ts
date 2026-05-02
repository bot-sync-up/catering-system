import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getOrder, markPaid, simulateProgress } from '@/lib/orders';

// Cardcom callback stub: in real life Cardcom posts here after the iframe completes.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const o = getOrder(id);
  if (!o || o.userId !== user.id) return NextResponse.json({ error: 'הזמנה לא נמצאה' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const ref = String(body.paymentRef || `CC-STUB-${Date.now()}`);
  const updated = markPaid(id, ref);
  // Kick off the simulated kitchen/delivery progression for the demo.
  simulateProgress(id);
  return NextResponse.json({ order: updated });
}
