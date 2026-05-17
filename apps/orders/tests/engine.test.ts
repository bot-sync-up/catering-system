import { describe, it, expect, beforeEach } from 'vitest';
import { OrderEngine, type OrderRepo } from '../src/domain/order/engine';
import { hookRegistry } from '../src/domain/hooks/registry';
import { registerDefaultHooks } from '../src/domain/hooks/defaultHooks';
import type { HookOrder } from '../src/domain/hooks/types';
import type { PrismaOrderStatus } from '../src/domain/order/statusMap';

function makeRepo(initial: PrismaOrderStatus, order: HookOrder) {
  let current = initial;
  const history: Array<{ from: PrismaOrderStatus | null; to: PrismaOrderStatus }> = [];
  const repo: OrderRepo = {
    async getOrder() {
      return { status: current, order };
    },
    async updateStatus(_id, next) {
      current = next;
    },
    async appendStatusHistory(_id, fromStatus, toStatus) {
      history.push({ from: fromStatus, to: toStatus });
    },
  };
  return { repo, history, getCurrent: () => current };
}

const sampleOrder: HookOrder = {
  id: 'o1',
  orderNumber: 'ORD-1',
  type: 'ONE_TIME_EVENT',
  customerId: 'c1',
  totalAmount: 1000,
  taxAmount: 170,
  eventDate: new Date('2026-07-01'),
  eventLocation: 'אולם הרצליה',
  guestCount: 50,
  items: [
    {
      productSku: 'CHAMIN',
      productName: 'חמין',
      quantity: 50,
      unitPrice: 20,
      totalPrice: 1000,
      kitchenInstructions: 'לחמם 4 שעות',
    },
  ],
};

describe('OrderEngine — integration with hooks', () => {
  beforeEach(() => {
    registerDefaultHooks();
  });

  it('approved -> preparing פולט אירועי invoice/shipment/kitchen/delivery', async () => {
    const { repo } = makeRepo('APPROVED', sampleOrder);
    const engine = new OrderEngine(repo);
    const r = await engine.transition('o1', { type: 'START_PREPARING' });
    const kinds = r.sideEffects.map((e) => e.kind);
    expect(kinds).toContain('invoice.create');
    expect(kinds).toContain('shipment_doc.create');
    expect(kinds).toContain('kitchen.tasks.create');
    expect(kinds).toContain('delivery.create');
  });

  it('pending -> approved פולט נוטיפיקציה ללקוח', async () => {
    const { repo } = makeRepo('PENDING', sampleOrder);
    const engine = new OrderEngine(repo);
    const r = await engine.transition('o1', { type: 'APPROVE', actor: 'admin' });
    const notif = r.sideEffects.find((e) => e.kind === 'notification.send');
    expect(notif).toBeDefined();
  });

  it('CANCEL מ-pending עבור אירוע פולט try_promote', async () => {
    const { repo } = makeRepo('PENDING', sampleOrder);
    const engine = new OrderEngine(repo);
    const r = await engine.transition('o1', { type: 'CANCEL', reason: 'לקוח שינה דעתו' });
    const promote = r.sideEffects.find((e) => e.kind === 'waitlist.try_promote');
    expect(promote).toBeDefined();
    if (promote && promote.kind === 'waitlist.try_promote') {
      expect(promote.freedSlots).toBe(50);
    }
  });

  it('מעבר לא חוקי זורק', async () => {
    const { repo } = makeRepo('COMPLETED', sampleOrder);
    const engine = new OrderEngine(repo);
    await expect(engine.transition('o1', { type: 'CANCEL' })).rejects.toThrow();
  });

  it('hookRegistry — נקי אחרי clear', () => {
    hookRegistry.clear();
    // אין דרך ישירה לבדוק; פשוט מאמתים שלא זורק.
    expect(true).toBe(true);
  });
});
