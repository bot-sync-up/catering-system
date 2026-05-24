import { NextResponse } from 'next/server';
import { OrderEngine } from '@/domain/order/engine';
import { prismaOrderRepo } from '@/server/repositories/prismaOrderRepo';
import { applyEffects } from '@/server/effects/applyEffects';
import { transitionSchema } from '@/server/trpc/schemas';

const engine = new OrderEngine(prismaOrderRepo);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = transitionSchema.safeParse({ orderId: id, event: body });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const isAdmin = req.headers.get('x-admin') === '1';
  if (
    (parsed.data.event.type === 'APPROVE' ||
      parsed.data.event.type === 'REJECT') &&
    !isAdmin
  ) {
    return NextResponse.json(
      { error: 'forbidden', message: 'דרושה הרשאת מנהל' },
      { status: 403 }
    );
  }
  try {
    const result = await engine.transition(id, parsed.data.event);
    await applyEffects(result.sideEffects);
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json(
      { error: 'transition_failed', message: (e as Error).message },
      { status: 409 }
    );
  }
}
