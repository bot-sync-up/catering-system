import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { db } from '@/lib/store';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const t = db().tickets.get(id);
  if (!t || t.userId !== user.id) return NextResponse.json({ error: 'פנייה לא נמצאה' }, { status: 404 });
  return NextResponse.json({ ticket: t });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const t = db().tickets.get(id);
  if (!t || t.userId !== user.id) return NextResponse.json({ error: 'פנייה לא נמצאה' }, { status: 404 });
  const { body } = await req.json().catch(() => ({}));
  if (!body) return NextResponse.json({ error: 'תוכן ריק' }, { status: 400 });
  t.replies.push({ from: 'user', body: String(body).slice(0, 4000), at: Date.now() });
  // Demo: support auto-reply after 3s.
  setTimeout(() => {
    const cur = db().tickets.get(id);
    if (!cur) return;
    cur.replies.push({
      from: 'support',
      body: 'תודה על פנייתך, נחזור אליך בהקדם.',
      at: Date.now()
    });
    cur.status = 'in_progress';
    db().tickets.set(id, cur);
  }, 3000);
  db().tickets.set(id, t);
  return NextResponse.json({ ticket: t });
}
