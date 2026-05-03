// CustomerService — manage customer, debt aggregation, freeze logic.
import { prisma } from '../lib/db.js';
import { config } from '../lib/config.js';

export class CustomerService {
  async create(data: {
    orgId: string; name: string; taxId?: string;
    email?: string; phone?: string; whatsapp?: string;
    address?: string; creditLimit?: number;
  }) {
    return prisma.customer.create({ data });
  }

  /** Sum of unpaid (balance) for a customer, optionally only OVERDUE. */
  async outstanding(customerId: string, onlyOverdue = false) {
    const where: any = {
      customerId,
      status: { in: ['ISSUED', 'SENT', 'PARTIAL_PAID', 'OVERDUE'] },
    };
    if (onlyOverdue) where.status = 'OVERDUE';
    const r = await prisma.document.aggregate({
      where,
      _sum: { balance: true },
    });
    return Number(r._sum.balance ?? 0);
  }

  async freeze(customerId: string, reason?: string) {
    return prisma.customer.update({
      where: { id: customerId },
      data: { status: 'FROZEN' },
    });
  }

  async unfreeze(customerId: string) {
    return prisma.customer.update({
      where: { id: customerId },
      data: { status: 'ACTIVE' },
    });
  }

  /** Re-evaluate freeze: if overdue > N days exists, freeze; else unfreeze. */
  async recheckFreezeTx(tx: any, customerId: string) {
    const cutoff = new Date(Date.now() - config.freezeOverdueDays * 24 * 3600 * 1000);
    const overdue = await tx.document.count({
      where: {
        customerId,
        balance: { gt: 0 },
        dueDate: { lt: cutoff },
        status: { notIn: ['PAID', 'CANCELLED', 'CREDITED'] },
      },
    });
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) return;
    if (overdue > 0 && customer.status !== 'FROZEN') {
      await tx.customer.update({ where: { id: customerId }, data: { status: 'FROZEN' } });
    } else if (overdue === 0 && customer.status === 'FROZEN') {
      await tx.customer.update({ where: { id: customerId }, data: { status: 'ACTIVE' } });
    }
  }

  /** Block placing new orders for FROZEN customers. */
  async assertCanOrder(customerId: string) {
    const c = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    if (c.status === 'FROZEN') {
      throw new Error(`לקוח מוקפא — לא ניתן להזמין חדש (חוב פתוח > ${config.freezeOverdueDays} ימים)`);
    }
  }
}

export const customerService = new CustomerService();
