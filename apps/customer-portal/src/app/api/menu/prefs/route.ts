import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { db } from '@/lib/store';

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'לא מחובר' }, { status: 401 }); }
  const body = await req.json().catch(() => ({}));
  const hideCategories = Array.isArray(body.hideCategories) ? body.hideCategories.map(String) : [];
  const favoriteIds = Array.isArray(body.favoriteIds) ? body.favoriteIds.map(String) : [];
  user.customMenuPrefs = { hideCategories, favoriteIds };
  db().users.set(user.id, user);
  return NextResponse.json({ ok: true, prefs: user.customMenuPrefs });
}
