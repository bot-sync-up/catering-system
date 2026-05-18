import { bus, db, STATUS_FLOW, uid, type Order, type OrderLine, type OrderStatus } from './store';

export function createOrder(userId: string, lines: OrderLine[]): Order {
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const o: Order = {
    id: uid('o'),
    userId,
    lines,
    total,
    status: 'placed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paid: false
  };
  db().orders.set(o.id, o);
  bus().emit(`order:${o.id}`, o);
  return o;
}

export function markPaid(orderId: string, paymentRef: string): Order | null {
  const o = db().orders.get(orderId);
  if (!o) return null;
  o.paid = true;
  o.paymentRef = paymentRef;
  o.status = 'approved';
  o.updatedAt = Date.now();
  o.documents = [{ name: `חשבונית_${o.id}.pdf`, url: `/api/documents/${o.id}` }];
  db().orders.set(o.id, o);
  bus().emit(`order:${o.id}`, o);
  return o;
}

export function advanceStatus(orderId: string): Order | null {
  const o = db().orders.get(orderId);
  if (!o) return null;
  const idx = STATUS_FLOW.indexOf(o.status);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return o;
  o.status = STATUS_FLOW[idx + 1];
  o.updatedAt = Date.now();
  db().orders.set(o.id, o);
  bus().emit(`order:${o.id}`, o);
  return o;
}

export function setStatus(orderId: string, status: OrderStatus): Order | null {
  const o = db().orders.get(orderId);
  if (!o) return null;
  o.status = status;
  o.updatedAt = Date.now();
  db().orders.set(o.id, o);
  bus().emit(`order:${o.id}`, o);
  return o;
}

export function getOrder(id: string): Order | null {
  return db().orders.get(id) ?? null;
}

export function listOrders(userId: string): Order[] {
  return Array.from(db().orders.values())
    .filter(o => o.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Auto-advance simulation (demo): after payment, progress through stages.
export function simulateProgress(orderId: string) {
  const stages: { delay: number; status: OrderStatus }[] = [
    { delay: 8000, status: 'preparing' },
    { delay: 18000, status: 'shipping' },
    { delay: 35000, status: 'delivered' }
  ];
  for (const s of stages) {
    setTimeout(() => setStatus(orderId, s.status), s.delay);
  }
}
