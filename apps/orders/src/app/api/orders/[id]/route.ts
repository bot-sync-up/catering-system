import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      payments: true,
      invoice: true,
      shipmentDoc: true,
      kitchenTasks: true,
      delivery: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) {
    return NextResponse.json(
      { error: 'not_found', message: 'הזמנה לא נמצאה' },
      { status: 404 }
    );
  }
  return NextResponse.json({ data: order });
}
