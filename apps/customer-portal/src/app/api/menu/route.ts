import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  const user = await getCurrentUser();
  const menu = db().menu;
  const prefs = user?.customMenuPrefs ?? { hideCategories: [], favoriteIds: [] };
  const filtered = menu.filter(m => !prefs.hideCategories.includes(m.category));
  return NextResponse.json({ items: filtered, prefs });
}
