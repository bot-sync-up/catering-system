import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appendJson } from '@/lib/db';
import type { Testimonial } from '@/lib/testimonials-data';

const Schema = z.object({
  name: z.string().min(2).max(80),
  role: z.string().max(80).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().min(20).max(800),
  consent: z.literal(true),
});

// In-memory rate limiter (sufficient for single-instance dev; replace with KV in prod)
const lastSubmit = new Map<string, number>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  const now = Date.now();
  const prev = lastSubmit.get(ip) ?? 0;
  if (now - prev < 30_000) {
    return NextResponse.json({ error: 'נא להמתין מעט לפני הגשה נוספת' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const t: Testimonial = {
    id: `t_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: parsed.data.name,
    role: parsed.data.role,
    rating: parsed.data.rating as 1 | 2 | 3 | 4 | 5,
    content: parsed.data.content,
    createdAt: new Date().toISOString(),
    status: 'pending', // moderation queue
  };

  await appendJson<Testimonial>('testimonials.json', t);
  lastSubmit.set(ip, now);

  return NextResponse.json({ ok: true, id: t.id });
}
