import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { db, uid, type Feedback } from '@/lib/store';

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const items = Array.from(db().feedback.values())
    .filter(f => f.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ feedback: items });
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const { stars, text, orderId } = await req.json().catch(() => ({}));
  const s = Math.max(1, Math.min(5, Number(stars) || 0));
  if (!s) return NextResponse.json({ error: 'דירוג חובה' }, { status: 400 });
  const f: Feedback = {
    id: uid('f'),
    userId: user.id,
    orderId: orderId ? String(orderId) : undefined,
    stars: s,
    text: String(text || '').slice(0, 2000),
    createdAt: Date.now()
  };
  db().feedback.set(f.id, f);
  return NextResponse.json({ feedback: f });
}
