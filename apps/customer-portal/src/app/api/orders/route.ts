import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { createOrder, listOrders } from '@/lib/orders';
import { db } from '@/lib/store';

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  return NextResponse.json({ orders: listOrders(user.id) });
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const body = await req.json().catch(() => ({}));
  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (!lines.length) return NextResponse.json({ error: 'עגלה ריקה' }, { status: 400 });

  // Resolve item info from the menu (avoid client-side price tampering).
  const menu = db().menu;
  const resolved = lines
    .map((l: { itemId: string; qty: number }) => {
      const m = menu.find(x => x.id === l.itemId);
      if (!m) return null;
      const qty = Math.max(1, Math.min(20, Number(l.qty) || 1));
      return { itemId: m.id, name: m.name, price: m.price, qty };
    })
    .filter(Boolean) as { itemId: string; name: string; price: number; qty: number }[];
  if (!resolved.length) return NextResponse.json({ error: 'אין פריטים תקינים' }, { status: 400 });

  const order = createOrder(user.id, resolved);
  return NextResponse.json({ order });
}
