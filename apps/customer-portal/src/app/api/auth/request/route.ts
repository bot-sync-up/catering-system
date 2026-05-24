import { NextResponse } from 'next/server';
import { generateOtp } from '@/lib/auth';

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({ email: '' }));
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 });
  }
  const code = generateOtp(email);
  // For demo only — in production we'd never return the code.
  return NextResponse.json({ ok: true, demoCode: code });
}
