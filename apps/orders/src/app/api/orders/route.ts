/**
 * REST API — POST /api/orders : יצירת הזמנה
 *            GET  /api/orders : רשימה
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { createOrderSchema } from '@/server/trpc/schemas';
import { generateOrderNumber } from '@/domain/order/orderNumber';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : undefined,
    take: Math.min(limit, 200),
    orderBy: { createdAt: 'desc' },
    include: { customer: true, items: true },
  });
  return NextResponse.json({ data: orders });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const customer = await prisma.customer.upsert({
    where: { phone: input.customer.phone },
    update: { fullName: input.customer.fullName },
    create: input.customer,
  });
  const subtotal = input.items.reduce(
    (s, it) => s + it.quantity * it.unitPrice,
    0
  );
  const tax = +(subtotal * 0.18).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      type: input.type,
      channel: input.channel,
      customerId: customer.id,
      eventDate: input.eventDate,
      eventLocation: input.eventLocation,
      guestCount: input.guestCount,
      customerNotes: input.customerNotes,
      subtotal,
      taxAmount: tax,
      totalAmount: total,
      items: {
        create: input.items.map((it) => ({
          productSku: it.productSku,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: +(it.unitPrice * it.quantity).toFixed(2),
          kitchenInstructions: it.kitchenInstructions,
        })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json({ data: order }, { status: 201 });
}
