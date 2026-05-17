import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/auth';
import { setSession } from '@/lib/session';

export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  if (!email || !code) return NextResponse.json({ error: 'נתונים חסרים' }, { status: 400 });
  const user = verifyOtp(email, code);
  if (!user) return NextResponse.json({ error: 'קוד שגוי או פג תוקף' }, { status: 401 });
  await setSession(user.id);
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
}
