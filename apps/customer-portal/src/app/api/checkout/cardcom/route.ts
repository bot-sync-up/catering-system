import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getOrder } from '@/lib/orders';

// Cardcom iframe stub. In production this would call Cardcom's "LowProfile"
// API and return a real iframe URL. For demo we point at our own fake page.
export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const { orderId } = await req.json().catch(() => ({}));
  const o = getOrder(String(orderId || ''));
  if (!o || o.userId !== user.id) return NextResponse.json({ error: 'הזמנה לא נמצאה' }, { status: 404 });
  const url = `/checkout?orderId=${encodeURIComponent(o.id)}&amount=${o.total}`;
  return NextResponse.json({ iframeUrl: url });
}
