import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appendJson } from '@/lib/db';

const Schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9+\-\s()]{7,20}$/),
  service: z.enum(['חתונה', 'בר/בת מצווה', 'משפחה', 'מסחרי', 'אירוע עסקי', 'אחר']),
  eventDate: z.string().optional(),
  message: z.string().min(10).max(2000),
  hp: z.string().max(0).optional(),
});

type Lead = z.infer<typeof Schema> & {
  id: string;
  createdAt: string;
  source: string;
  status: 'new' | 'contacted' | 'won' | 'lost';
};

const lastSubmit = new Map<string, number>();

async function pushToCrm(lead: Lead) {
  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) return; // dev/no-op
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRM_WEBHOOK_TOKEN && { Authorization: `Bearer ${process.env.CRM_WEBHOOK_TOKEN}` }),
      },
      body: JSON.stringify(lead),
    });
  } catch (err) {
    console.error('CRM webhook failed', err);
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  const now = Date.now();
  const prev = lastSubmit.get(ip) ?? 0;
  if (now - prev < 15_000) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  if (parsed.data.hp) {
    // honeypot hit — pretend success but drop
    return NextResponse.json({ ok: true });
  }

  const lead: Lead = {
    ...parsed.data,
    id: `l_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    source: 'public-site',
    status: 'new',
  };

  await appendJson<Lead>('leads.json', lead);
  await pushToCrm(lead);
  lastSubmit.set(ip, now);

  return NextResponse.json({ ok: true, id: lead.id });
}
