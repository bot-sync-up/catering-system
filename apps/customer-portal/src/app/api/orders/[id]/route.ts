import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getOrder } from '@/lib/orders';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const o = getOrder(id);
  if (!o || o.userId !== user.id) return NextResponse.json({ error: 'הזמנה לא נמצאה' }, { status: 404 });
  return NextResponse.json({ order: o });
}
