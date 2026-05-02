import { NextResponse } from 'next/server';
import { diffVersions } from '@/lib/diff';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const a = url.searchParams.get('from');
  const b = url.searchParams.get('to');
  if (!a || !b) return NextResponse.json({ error: 'from, to required' }, { status: 400 });
  return NextResponse.json(await diffVersions(a, b));
}
