import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { db, uid, type Ticket } from '@/lib/store';

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const tickets = Array.from(db().tickets.values())
    .filter(t => t.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const { subject, body } = await req.json().catch(() => ({}));
  if (!subject || !body) return NextResponse.json({ error: 'נושא וגוף נדרשים' }, { status: 400 });
  const t: Ticket = {
    id: uid('t'),
    userId: user.id,
    subject: String(subject).slice(0, 200),
    body: String(body).slice(0, 4000),
    status: 'open',
    createdAt: Date.now(),
    replies: []
  };
  db().tickets.set(t.id, t);
  return NextResponse.json({ ticket: t });
}
